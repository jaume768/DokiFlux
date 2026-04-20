import json
import logging
import re
from decimal import Decimal
from typing import AsyncGenerator, Any

from asgiref.sync import sync_to_async
from django.utils.timezone import now

from apps.billing.services import consume_credits, get_balance
from apps.projects.models import ChatMessage, Project

from .models import Generation
from .providers.registry import get_model_config, calculate_cost

logger = logging.getLogger(__name__)

# Conservative minimum cost estimate to pre-check credits
MIN_COST_ESTIMATE = Decimal("0.005")

_TITLE_SYSTEM = (
    "You are a title generator. Generate a concise title of 3 to 4 words for a UI/web project "
    "based on the user's description. Return ONLY the title text — no quotes, no punctuation at "
    "the end, no explanations."
)


async def _call_title_gemini(prompt: str) -> str:
    """Cheapest option: Gemini Flash Lite via generateContent."""
    from .providers.key_pool import _ensure_pools, _gemini_pool
    _ensure_pools()
    if not _gemini_pool.available:
        raise RuntimeError("No Gemini keys")
    api_key = _gemini_pool.next()
    import httpx
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent"
    payload = {
        "system_instruction": {"parts": [{"text": _TITLE_SYSTEM}]},
        "contents": [{"role": "user", "parts": [{"text": prompt[:500]}]}],
        "generationConfig": {"maxOutputTokens": 30, "temperature": 0.4},
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(url, json=payload, params={"key": api_key})
        resp.raise_for_status()
        data = resp.json()
        return data["candidates"][0]["content"]["parts"][0]["text"].strip()


async def _call_title_openai(prompt: str) -> str:
    """Fallback: OpenAI gpt-4o-mini via Chat Completions."""
    from .providers.key_pool import _ensure_pools, _openai_pool
    _ensure_pools()
    if not _openai_pool.available:
        raise RuntimeError("No OpenAI keys")
    api_key = _openai_pool.next()
    import httpx
    payload = {
        "model": "gpt-4o-mini",
        "messages": [
            {"role": "system", "content": _TITLE_SYSTEM},
            {"role": "user", "content": prompt[:500]},
        ],
        "max_tokens": 30,
        "temperature": 0.4,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.openai.com/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()


async def _call_title_anthropic(prompt: str) -> str:
    """Last fallback: Claude Haiku via Messages API."""
    from .providers.key_pool import _ensure_pools, _anthropic_pool
    _ensure_pools()
    if not _anthropic_pool.available:
        raise RuntimeError("No Anthropic keys")
    api_key = _anthropic_pool.next()
    import httpx
    payload = {
        "model": "claude-haiku-4-5",
        "system": _TITLE_SYSTEM,
        "messages": [{"role": "user", "content": prompt[:500]}],
        "max_tokens": 30,
    }
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            json=payload,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"].strip()


async def generate_ai_title(prompt: str) -> str:
    """
    Generate a 3-5 word AI title for a project.
    Tries providers cheapest-first: Gemini Flash Lite → OpenAI → Anthropic.
    Returns a cleaned title string, or falls back to the first 5 words of the prompt.
    """
    for caller in (_call_title_gemini, _call_title_openai, _call_title_anthropic):
        try:
            title = await caller(prompt)
            title = title.strip('"\'').strip()
            if title and len(title) <= 100:
                return title
        except Exception as exc:
            logger.debug("Title provider %s failed: %s", caller.__name__, exc)
    return " ".join(prompt.split()[:5])


def get_provider(model: str = "gpt-5.4"):
    """Factory: return the appropriate provider for the model."""
    config = get_model_config(model)
    provider_name = config["provider"]

    if provider_name == "openai":
        from .providers.openai import OpenAIProvider
        return OpenAIProvider()
    elif provider_name == "anthropic":
        from .providers.anthropic import AnthropicProvider
        return AnthropicProvider()
    elif provider_name == "gemini":
        from .providers.gemini import GeminiProvider
        return GeminiProvider()
    else:
        raise ValueError(f"Unknown provider: {provider_name}")


def build_messages(prompt: str, current_project: str | None, chat_history: list[dict]) -> list[dict]:
    """
    Build the message list for the AI provider.
    Mirrors the frontend's buildCompressedPayload logic.
    """
    messages = []

    if current_project:
        messages.append({
            "role": "developer",
            "content": f"Current project state (all files):\n{current_project}",
        })

    for msg in chat_history:
        messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    messages.append({"role": "user", "content": prompt})
    return messages


async def stream_generation(
    user,
    project: Project,
    prompt: str,
    chat_history: list[dict],
    model: str = "gpt-5.4",
    is_autofix: bool = False,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Full generation flow:
    1. Pre-check credits
    2. Create Generation record
    3. Stream from AI provider
    4. On completion: deduct credits, save messages, update project
    5. Yield SSE chunks throughout
    """
    # 1. Pre-check credits
    balance = await sync_to_async(get_balance)(user)
    if balance <= 0:
        yield {"type": "error", "error": "Saldo agotado o en negativo. Recarga créditos para continuar."}
        return

    # 2. Serialize current project state
    file_map = await sync_to_async(lambda: project.file_map or {})()
    current_project = None
    if file_map:
        current_project = "\n\n".join(
            f"// --- FILE: {path} ---\n{content}"
            for path, content in file_map.items()
        )

    # 3. Build messages
    messages = build_messages(prompt, current_project, chat_history)

    # 4. Create Generation record (with snapshot of current state)
    generation = await _create_generation(user, project, prompt, model, file_map or {}, is_autofix, chat_history)

    # 5. Send generation_id to frontend immediately so Restore button can be shown
    yield {"type": "generation_id", "id": generation.id}

    # 6. Update status to streaming
    generation.status = "streaming"
    await _save_generation(generation)

    # 7. Stream from provider — wrapped in try/finally so billing always runs,
    #    including when the client cancels mid-stream (GeneratorExit via aclose()).
    provider = get_provider(model)
    usage_data = None
    has_code = False
    has_chat = False
    full_code = ""
    chat_text = ""
    error_occurred = False
    completed_normally = False

    model_config = get_model_config(model)
    max_tokens = model_config["max_output_tokens"]

    try:
        async for chunk in provider.stream_generate(messages, model=model, max_tokens=max_tokens):
            chunk_type = chunk.get("type")

            if chunk_type == "text":
                has_code = True
                full_code += chunk.get("content", "")

            if chunk_type == "chat":
                has_chat = True
                chat_text += chunk.get("content", "")

            if chunk_type == "usage":
                usage_data = chunk.get("usage", {})

            if chunk_type == "error":
                error_occurred = True

            yield chunk

        completed_normally = True
    finally:
        cancelled = not completed_normally and not error_occurred
        await _finalize_generation(
            generation=generation,
            usage_data=usage_data,
            has_code=has_code,
            has_chat=has_chat,
            full_code=full_code,
            chat_text=chat_text,
            error_occurred=error_occurred,
            cancelled=cancelled,
            user=user,
            project=project,
            prompt=prompt,
            messages=messages,
            model=model,
            is_autofix=is_autofix,
        )


def _build_file_messages(
    prompt: str,
    file_path: str,
    current_project: str | None,
    already_generated: str | None,
    chat_history: list[dict],
) -> list[dict]:
    """Build the message list for generating a single file."""
    context_parts = [f"User request: {prompt}"]
    if current_project:
        context_parts.append(f"Existing project files:\n{current_project}")
    if already_generated:
        context_parts.append(f"Files already generated in this session:\n{already_generated}")
    context_parts.append(f"\nYour task: Generate ONLY the file '{file_path}'.")

    messages = [{"role": "developer", "content": "\n\n".join(context_parts)}]
    for msg in chat_history[-4:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": f"Generate the file {file_path}"})
    return messages


def _extract_file_content(raw_tool_args: str) -> str:
    """
    Extract the code string (WITH its // --- FILE marker) from raw streamed content.

    Handles two formats:
    - Plain text (Anthropic/Gemini text-mode): content starts with '// --- FILE:' directly
    - JSON tool call (OpenAI): '{"code": "// --- FILE: /App.tsx ---\\nexport..."}'
    """
    raw = raw_tool_args.strip()
    if not raw:
        return ""
    # Plain text output — starts with file marker, no JSON wrapper to strip
    if raw.startswith("// ---") or raw.startswith("//---"):
        return raw
    # JSON tool call format (OpenAI) — try to parse and extract the code field
    try:
        parsed = json.loads(raw)
        return parsed.get("code", "")
    except (json.JSONDecodeError, ValueError):
        raw = re.sub(r'^\s*\{\s*"code"\s*:\s*"', "", raw)
        raw = re.sub(r'"\s*\}\s*$', "", raw)
        return (
            raw.replace("\\n", "\n")
            .replace("\\t", "\t")
            .replace('\\"', '"')
            .replace("\\\\", "\\")
        )


def _get_file_from_code(code: str, file_path: str) -> str:
    """
    Extract the content of a specific file from multi-file formatted code.
    If the AI included multiple files, returns only the requested one.
    Falls back to the full code (minus the first marker) if file not found.
    """
    escaped = re.escape(file_path)
    pattern = rf"//\s*---\s*FILE:\s*{escaped}\s*---\s*\n(.*?)(?=//\s*---\s*(?:FILE|DELETE):|$)"
    match = re.search(pattern, code, re.DOTALL)
    if match:
        return match.group(1).strip()
    return re.sub(r"^//\s*---\s*FILE:[^\n]*---\s*\n", "", code.strip())


# Entry-point filenames (by basename, case-insensitive) that must be generated LAST
# so they can import from supporting files that exist by then.
_ENTRY_POINT_BASENAMES = {
    "app.tsx", "app.jsx", "app.ts",
    "index.tsx", "index.jsx",
    "main.tsx", "main.jsx",
}


def _sort_files_for_generation(files: list[str]) -> list[str]:
    """
    Move entry-point files (App.tsx / index.tsx / main.tsx) to the end of the
    generation order while preserving the planner's relative ordering for the
    rest. Rationale: when App.tsx is generated first, its imports reference
    components that have not been created yet and the model hallucinates
    exports/props. Creating supporting files first means App.tsx can see them
    in `already_generated` context and import them correctly.
    """
    def is_entry(path: str) -> bool:
        base = path.rsplit("/", 1)[-1].lower()
        return base in _ENTRY_POINT_BASENAMES

    non_entries = [f for f in files if not is_entry(f)]
    entries = [f for f in files if is_entry(f)]
    return non_entries + entries


def _parse_review_patches(raw: str, existing_files: dict[str, str]) -> dict[str, str]:
    """
    Parse multi-file format from the reviewer's output into {path: content}.
    Only existing files are accepted (reviewer is not allowed to add new ones).
    """
    if not raw or not raw.strip():
        return {}

    # Strip any accidental markdown fences the model might add.
    cleaned = re.sub(r"```(?:tsx?|jsx?|typescript|javascript)?\s*", "", raw)
    cleaned = re.sub(r"```\s*", "", cleaned)

    pattern = re.compile(r"//\s*---\s*FILE:\s*(\S+?)\s*---\s*\n", re.MULTILINE)
    matches = list(pattern.finditer(cleaned))
    if not matches:
        return {}

    patches: dict[str, str] = {}
    for i, m in enumerate(matches):
        path = m.group(1).strip()
        if not path.startswith("/"):
            path = "/" + path
        start = m.end()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(cleaned)
        content = cleaned[start:end].strip()
        # Only patch files that actually exist — prevents reviewer from adding
        # hallucinated files.
        if path in existing_files and content:
            patches[path] = content
    return patches


async def stream_phased_generation(
    user,
    project: Project,
    prompt: str,
    chat_history: list[dict],
    model: str = "gpt-5.4",
    is_autofix: bool = False,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    v0-style phased generation:
    1. Planning call → AI returns list of files to create/modify
    2. Per-file streaming → one stream_generate call per file with progress events
    """
    # 1. Pre-check credits
    balance = await sync_to_async(get_balance)(user)
    if balance <= 0:
        yield {"type": "error", "error": "Saldo agotado o en negativo. Recarga créditos para continuar."}
        return

    # 2. Serialize current project state
    file_map = await sync_to_async(lambda: project.file_map or {})()
    current_project = None
    if file_map:
        current_project = "\n\n".join(
            f"// --- FILE: {path} ---\n{content}"
            for path, content in file_map.items()
        )

    # 3. Build planner messages (same structure as standard, without system prompt override)
    planner_messages = build_messages(prompt, current_project, chat_history)

    # 4. Create generation record
    generation = await _create_generation(user, project, prompt, model, file_map or {}, is_autofix, chat_history)
    yield {"type": "generation_id", "id": generation.id}
    generation.status = "streaming"
    await _save_generation(generation)

    # 4b. Persist user message immediately so chat history survives disconnects
    if not is_autofix:
        await _create_message(project=project, role="user", content=prompt, message_type="chat")

    provider = get_provider(model)
    model_config = get_model_config(model)
    max_tokens = model_config["max_output_tokens"]
    file_max_tokens = min(max_tokens, 12000)

    total_input_tokens = 0
    total_output_tokens = 0
    error_occurred = False
    completed_normally = False
    accumulated_files: dict[str, str] = {}
    full_code = ""
    chat_text = ""

    try:
        # 5. Planning phase — fast non-streaming call
        plan = await provider.call_planner(planner_messages, model)

        plan_usage = plan.get("usage", {})
        total_input_tokens += plan_usage.get("inputTokens", 0)
        total_output_tokens += plan_usage.get("outputTokens", 0)

        thinking = plan.get("thinking", "")
        files = plan.get("files", [])
        chat_response = plan.get("chat_response", "").strip()

        if thinking:
            yield {"type": "thinking", "content": thinking}

        if not files and chat_response:
            # Planner decided to ask the user for clarification instead of generating
            yield {"type": "chat", "content": chat_response}
            chat_text = chat_response
            has_chat = True
            cost = calculate_cost(total_input_tokens, total_output_tokens, model)
            yield {
                "type": "usage",
                "usage": {
                    "inputTokens": total_input_tokens,
                    "outputTokens": total_output_tokens,
                    "cost": float(cost),
                },
            }
            yield {"type": "done"}
            completed_normally = True
            return

        # Enforce entry-point-last ordering so App.tsx sees its supporting files
        # in `already_generated` context before importing from them.
        files = _sort_files_for_generation(files)

        if not files:
            # Planner returned empty list — fall back to standard single-shot generation
            async for chunk in provider.stream_generate(planner_messages, model=model, max_tokens=max_tokens):
                if chunk["type"] == "usage":
                    u = chunk.get("usage", {})
                    total_input_tokens += u.get("inputTokens", 0)
                    total_output_tokens += u.get("outputTokens", 0)
                    cost = calculate_cost(total_input_tokens, total_output_tokens, model)
                    yield {
                        "type": "usage",
                        "usage": {
                            "inputTokens": total_input_tokens,
                            "outputTokens": total_output_tokens,
                            "cost": float(cost),
                        },
                    }
                elif chunk["type"] == "text":
                    full_code += chunk.get("content", "")
                    yield chunk
                elif chunk["type"] == "chat":
                    chat_text += chunk.get("content", "")
                    yield chunk
                elif chunk["type"] == "error":
                    error_occurred = True
                    yield chunk
                else:
                    yield chunk
            completed_normally = True
            return

        # 6. Emit plan to frontend
        #    `action` lets the frontend render a localized label; `label` is kept
        #    for backward compatibility with older clients.
        tasks = [
            {
                "file_path": fp,
                "action": "update" if fp in (file_map or {}) else "create",
                "label": ("Updating" if fp in (file_map or {}) else "Creating") + f" {fp}",
            }
            for fp in files
        ]
        yield {"type": "plan", "tasks": tasks}

        # 7. Per-file generation loop
        for idx, file_path in enumerate(files):
            yield {"type": "task_start", "file_path": file_path, "index": idx, "total": len(files)}

            already_gen_ctx = (
                "\n\n".join(
                    f"// --- FILE: {p} ---\n{c}"
                    for p, c in accumulated_files.items()
                )
                if accumulated_files
                else None
            )

            file_messages = _build_file_messages(
                prompt=prompt,
                file_path=file_path,
                current_project=current_project,
                already_generated=already_gen_ctx,
                chat_history=chat_history,
            )

            file_raw = ""
            async for chunk in provider.stream_generate(
                file_messages, model=model, max_tokens=file_max_tokens
            ):
                if chunk["type"] == "text":
                    file_raw += chunk.get("content", "")
                    yield {"type": "file_chunk", "content": chunk["content"], "file_path": file_path}
                elif chunk["type"] == "usage":
                    u = chunk.get("usage", {})
                    total_input_tokens += u.get("inputTokens", 0)
                    total_output_tokens += u.get("outputTokens", 0)
                elif chunk["type"] == "error":
                    error_occurred = True
                    yield chunk
                # skip "done" and "chat" from individual file calls

            # Parse and store the generated file
            code_with_marker = _extract_file_content(file_raw)
            if code_with_marker:
                content_only = _get_file_from_code(code_with_marker, file_path)
                accumulated_files[file_path] = content_only
                full_code += f"// --- FILE: {file_path} ---\n{content_only}\n\n"
                yield {
                    "type": "task_done",
                    "file_path": file_path,
                    "content": content_only,
                }
            else:
                yield {"type": "task_done", "file_path": file_path, "content": ""}

        # 8. Cross-file review phase — only worthwhile when ≥2 files were produced.
        if len(accumulated_files) >= 2:
            from .providers.prompts import build_reviewer_messages

            yield {"type": "review_start", "total_files": len(accumulated_files)}

            review_messages = build_reviewer_messages(
                user_prompt=prompt,
                all_files=accumulated_files,
            )
            review_raw = ""
            try:
                async for chunk in provider.stream_generate(
                    review_messages, model=model, max_tokens=file_max_tokens
                ):
                    if chunk["type"] == "text":
                        review_raw += chunk.get("content", "")
                    elif chunk["type"] == "usage":
                        u = chunk.get("usage", {})
                        total_input_tokens += u.get("inputTokens", 0)
                        total_output_tokens += u.get("outputTokens", 0)
                    elif chunk["type"] == "error":
                        logger.warning(
                            "Review phase error (non-fatal): %s", chunk.get("error")
                        )
                        break
            except Exception as exc:
                logger.warning("Review phase failed (non-fatal): %s", exc)

            # Reviewer output may come wrapped in the OpenAI JSON tool-call envelope
            # (same as file_gen). Normalise it through _extract_file_content first.
            review_text = _extract_file_content(review_raw) if review_raw else ""
            patches = _parse_review_patches(review_text, accumulated_files)
            for patched_path, new_content in patches.items():
                accumulated_files[patched_path] = new_content
                yield {
                    "type": "task_done",
                    "file_path": patched_path,
                    "content": new_content,
                }

            yield {
                "type": "review_done",
                "patched_files": list(patches.keys()),
            }

        # 9. Emit total accumulated usage
        cost = calculate_cost(total_input_tokens, total_output_tokens, model)
        yield {
            "type": "usage",
            "usage": {
                "inputTokens": total_input_tokens,
                "outputTokens": total_output_tokens,
                "cost": float(cost),
            },
        }
        yield {"type": "done"}
        completed_normally = True

    finally:
        cancelled = not completed_normally and not error_occurred
        explicit_cancel = False

        # Client disconnected mid-stream → hand off to Celery instead of cancelling,
        # UNLESS the user explicitly cancelled via the API (in which case we fall
        # through to the billing block so consumed tokens are charged).
        if cancelled and not error_occurred:
            try:
                await sync_to_async(generation.refresh_from_db)(fields=["status"])
                if generation.status == "cancelled":
                    logger.info(
                        "Generation %s was explicitly cancelled — billing and skipping background task launch",
                        generation.id,
                    )
                    explicit_cancel = True
                else:
                    generation.status = "pending"
                    await _save_generation(generation)
                    from .tasks import run_background_generation  # deferred to avoid circular import
                    task = run_background_generation.delay(generation.id)
                    generation.celery_task_id = task.id
                    await _save_generation(generation)
                    logger.info(
                        "Client disconnected — background task launched for generation %s (task %s)",
                        generation.id, task.id,
                    )
                    return
            except Exception as exc:
                logger.error(
                    "Failed to launch background generation for %s: %s",
                    generation.id, exc,
                )
                # Fall through to normal cancellation handling below

        cost = calculate_cost(total_input_tokens, total_output_tokens, model)
        usage_data = (
            {
                "inputTokens": total_input_tokens,
                "outputTokens": total_output_tokens,
                "cost": float(cost),
            }
            if (total_input_tokens > 0 or total_output_tokens > 0)
            else None
        )
        await _finalize_generation(
            generation=generation,
            usage_data=usage_data,
            has_code=bool(full_code.strip()),
            has_chat=bool(chat_text.strip()),
            full_code=full_code,
            chat_text=chat_text,
            error_occurred=error_occurred,
            cancelled=cancelled,
            user=user,
            project=project,
            prompt=prompt,
            messages=planner_messages,
            model=model,
            is_autofix=is_autofix,
            user_msg_already_saved=True,
        )


# --- Async DB helpers (sync_to_async wrappers) ---


@sync_to_async
def _create_generation(user, project, prompt, model, file_map_snapshot=None, is_autofix=False, chat_history=None):
    return Generation.objects.create(
        user=user,
        project=project,
        prompt=prompt,
        model=model,
        file_map_snapshot=file_map_snapshot,
        is_autofix=is_autofix,
        chat_history_cache=chat_history,
    )


@sync_to_async
def _save_generation(generation):
    generation.save()


@sync_to_async
def _update_project_model(project, model):
    project.__class__.objects.filter(pk=project.pk).update(last_used_model=model)


@sync_to_async
def _create_message(project, role, content, message_type, usage=None, raw_code="", generation_id=None):
    return ChatMessage.objects.create(
        project=project,
        role=role,
        content=content,
        message_type=message_type,
        usage=usage,
        raw_code=raw_code,
        generation_id=generation_id,
    )


async def _finalize_generation(
    generation, usage_data, has_code, has_chat,
    full_code, chat_text, error_occurred, cancelled,
    user, project, prompt, messages, model="",
    is_autofix=False, user_msg_already_saved=False,
):
    """Handle billing and record updates after streaming ends (normally, cancelled, or error)."""

    # Persist the user's model choice on the project regardless of outcome:
    # even cancelled/failed gens carry a valid "last picked model" signal so
    # re-entering the project restores the UI selection accurately.
    if model:
        try:
            await _update_project_model(project, model)
            logger.info("[model] persisted last_used_model=%s for project=%s", model, project.id)
        except Exception as exc:
            logger.warning("[model] failed to persist last_used_model for project=%s: %s", project.id, exc)

    if error_occurred and not cancelled:
        generation.status = "failed"
        await _save_generation(generation)
        return

    if cancelled:
        # If usage chunk didn't arrive before cancel, estimate from received content
        if not usage_data:
            input_chars = sum(len(m.get("content", "")) for m in messages)
            output_chars = len(full_code) + len(chat_text)
            est_input = max(input_chars // 4, 0)
            est_output = max(output_chars // 4, 0)
            if est_input > 0 or est_output > 0:
                est_cost = calculate_cost(est_input, est_output, generation.model)
                usage_data = {
                    "inputTokens": est_input,
                    "outputTokens": est_output,
                    "cost": float(est_cost),
                }

        if usage_data:
            generation.input_tokens = usage_data.get("inputTokens", 0)
            generation.output_tokens = usage_data.get("outputTokens", 0)
            generation.cost = Decimal(str(usage_data.get("cost", 0)))

        generation.status = "cancelled"
        generation.completed_at = now()

        actual_cost = generation.cost
        if actual_cost > 0 and not is_autofix:
            await sync_to_async(consume_credits)(
                user,
                actual_cost,
                description=f"Cancelled gen #{generation.id}: {prompt[:100]}",
                generation_id=generation.id,
            )

        await _save_generation(generation)
        return

    # --- Normal completion ---
    if usage_data:
        generation.input_tokens = usage_data.get("inputTokens", 0)
        generation.output_tokens = usage_data.get("outputTokens", 0)
        generation.cost = Decimal(str(usage_data.get("cost", 0)))

    if has_code and full_code.strip():
        generation.status = "completed"
        generation.completed_at = now()

        actual_cost = generation.cost
        if actual_cost > 0 and not is_autofix:
            success = await sync_to_async(consume_credits)(
                user,
                actual_cost,
                description=f"Generation #{generation.id}: {prompt[:100]}",
                generation_id=generation.id,
            )
            if not success:
                logger.warning(
                    "Failed to deduct credits for generation %s (user %s, cost %s)",
                    generation.id, user.email, actual_cost,
                )

        if model:
            await _update_project_model(project, model)

        await _create_message(
            project=project,
            role="assistant",
            content=f"Generated code ({generation.input_tokens} input, {generation.output_tokens} output tokens)",
            message_type="code",
            usage=usage_data,
            raw_code=full_code,
            generation_id=generation.id,
        )

    elif has_chat:
        generation.status = "completed"
        generation.completed_at = now()

        actual_cost = generation.cost
        if actual_cost > 0 and not is_autofix:
            await sync_to_async(consume_credits)(
                user,
                actual_cost,
                description=f"Chat #{generation.id}: {prompt[:100]}",
                generation_id=generation.id,
            )

        if not user_msg_already_saved:
            await _create_message(project=project, role="user", content=prompt, message_type="chat")
        await _create_message(
            project=project,
            role="assistant",
            content=chat_text,
            message_type="chat",
            usage=usage_data,
            generation_id=generation.id,
        )

    else:
        generation.status = "no_changes"

    await _save_generation(generation)
