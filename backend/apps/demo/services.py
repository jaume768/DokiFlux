"""
Demo mode generation: mirrors `stream_phased_generation` but works with a
DemoSession instead of a User/Project pair. Forces the cheapest model
(gemini-3.1-flash-lite), hard-caps tokens and credits, and stores the resulting
files directly on the DemoSession.
"""
import logging
from decimal import Decimal
from typing import Any, AsyncGenerator

from asgiref.sync import sync_to_async

from apps.generation.providers.registry import (
    calculate_cost,
    get_model_config,
)
from apps.generation.services import (
    _build_file_messages,
    _extract_file_content,
    _get_file_from_code,
    _sort_files_for_generation,
    build_messages,
    get_provider,
)

from .models import DemoSession

logger = logging.getLogger(__name__)


# --- Demo hard limits ---
DEMO_MODEL = "gemini-3.1-flash-lite"
DEMO_MAX_FILE_TOKENS = 4000
DEMO_MAX_PLANNER_TOKENS = 4000
DEMO_MAX_FILES_PER_GEN = 8  # safety cap
DEMO_MAX_PROMPT_LENGTH = 1000


@sync_to_async
def _get_session(session_id) -> DemoSession | None:
    try:
        return DemoSession.objects.get(session_id=session_id)
    except DemoSession.DoesNotExist:
        return None


@sync_to_async
def _save_session(session: DemoSession, fields: list[str]):
    session.save(update_fields=fields)


@sync_to_async
def _apply_usage_and_save(session: DemoSession, input_tokens: int, output_tokens: int, cost: Decimal):
    """Atomically charge the session and persist counters."""
    session.credits_remaining = max(
        Decimal("0"), session.credits_remaining - cost
    )
    session.total_input_tokens = (session.total_input_tokens or 0) + input_tokens
    session.total_output_tokens = (session.total_output_tokens or 0) + output_tokens
    session.generation_count = (session.generation_count or 0) + 1
    session.save(update_fields=[
        "credits_remaining", "total_input_tokens", "total_output_tokens",
        "generation_count", "last_active_at",
    ])


@sync_to_async
def _persist_files_and_history(
    session: DemoSession,
    new_files: dict[str, str],
    user_prompt: str,
    assistant_content: str,
):
    """Merge generated files into session.file_map and append chat turn."""
    fm = dict(session.file_map or {})
    fm.update(new_files)
    session.file_map = fm

    history = list(session.chat_history or [])
    history.append({"role": "user", "content": user_prompt})
    if assistant_content:
        history.append({"role": "assistant", "content": assistant_content})
    session.chat_history = history[-40:]  # cap history size
    session.save(update_fields=["file_map", "chat_history", "last_active_at"])


async def stream_demo_generation(
    session: DemoSession,
    prompt: str,
) -> AsyncGenerator[dict[str, Any], None]:
    """
    Phased generation for demo users. Streams the same SSE events as the
    production flow (plan, task_start, file_chunk, task_done, usage, done)
    but bound to a DemoSession's budget and file_map.
    """
    # 1. Pre-checks
    if not session.has_credits:
        yield {"type": "error", "error": "demo_credits_exhausted"}
        return

    prompt = (prompt or "").strip()
    if len(prompt) < 3:
        yield {"type": "error", "error": "Prompt demasiado corto."}
        return
    if len(prompt) > DEMO_MAX_PROMPT_LENGTH:
        prompt = prompt[:DEMO_MAX_PROMPT_LENGTH]

    framework = session.framework or "react"
    file_map = dict(session.file_map or {})
    chat_history = list(session.chat_history or [])

    current_project = None
    if file_map:
        current_project = "\n\n".join(
            f"// --- FILE: {path} ---\n{content}"
            for path, content in file_map.items()
        )

    # 2. Planner
    planner_messages = build_messages(prompt, current_project, chat_history, framework=framework)
    provider = get_provider(DEMO_MODEL)
    model_cfg = get_model_config(DEMO_MODEL)

    total_input_tokens = 0
    total_output_tokens = 0
    accumulated_files: dict[str, str] = {}
    assistant_text_for_history = ""
    error_occurred = False
    completed_normally = False

    try:
        plan = await provider.call_planner(planner_messages, DEMO_MODEL)
        plan_usage = plan.get("usage", {}) or {}
        total_input_tokens += plan_usage.get("inputTokens", 0)
        total_output_tokens += plan_usage.get("outputTokens", 0)

        files = plan.get("files", []) or []
        chat_response = (plan.get("chat_response") or "").strip()
        thinking = plan.get("thinking", "")

        if thinking:
            yield {"type": "thinking", "content": thinking}

        # Planner-only response (clarification/conversation)
        if not files and chat_response:
            yield {"type": "chat", "content": chat_response}
            assistant_text_for_history = chat_response
            # Charge + persist + done
            cost = calculate_cost(total_input_tokens, total_output_tokens, DEMO_MODEL)
            await _apply_usage_and_save(session, total_input_tokens, total_output_tokens, cost)
            await _persist_files_and_history(session, {}, prompt, assistant_text_for_history)
            yield {
                "type": "usage",
                "usage": {
                    "inputTokens": total_input_tokens,
                    "outputTokens": total_output_tokens,
                    "cost": float(cost),
                    "creditsRemaining": float(session.credits_remaining),
                },
            }
            yield {"type": "done"}
            completed_normally = True
            return

        # Safety cap on number of files
        if len(files) > DEMO_MAX_FILES_PER_GEN:
            files = files[:DEMO_MAX_FILES_PER_GEN]

        files = _sort_files_for_generation(files)

        if not files:
            yield {"type": "error", "error": "El planner no devolvió archivos. Inténtalo de nuevo."}
            error_occurred = True
            return

        # 3. Emit plan
        tasks = [
            {
                "file_path": fp,
                "action": "update" if fp in file_map else "create",
                "label": ("Updating" if fp in file_map else "Creating") + f" {fp}",
            }
            for fp in files
        ]
        yield {"type": "plan", "tasks": tasks}

        # 4. Per-file generation
        for idx, file_path in enumerate(files):
            # Check credits before each file — stop mid-gen if exhausted
            current_cost = calculate_cost(total_input_tokens, total_output_tokens, DEMO_MODEL)
            if current_cost >= session.credits_remaining:
                yield {"type": "error", "error": "demo_credits_exhausted"}
                break

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
                framework=framework,
            )

            file_raw = ""
            async for chunk in provider.stream_generate(
                file_messages, model=DEMO_MODEL, max_tokens=DEMO_MAX_FILE_TOKENS
            ):
                if chunk["type"] == "text":
                    file_raw += chunk.get("content", "")
                    yield {"type": "file_chunk", "content": chunk["content"], "file_path": file_path}
                elif chunk["type"] == "usage":
                    u = chunk.get("usage", {}) or {}
                    total_input_tokens += u.get("inputTokens", 0)
                    total_output_tokens += u.get("outputTokens", 0)
                elif chunk["type"] == "error":
                    error_occurred = True
                    yield chunk

            code_with_marker = _extract_file_content(file_raw)
            if code_with_marker:
                content_only = _get_file_from_code(code_with_marker, file_path)
                accumulated_files[file_path] = content_only
                yield {"type": "task_done", "file_path": file_path, "content": content_only}
            else:
                yield {"type": "task_done", "file_path": file_path, "content": ""}

        # 5. Final usage event
        cost = calculate_cost(total_input_tokens, total_output_tokens, DEMO_MODEL)
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

    except Exception as exc:
        logger.exception("Demo generation failed: %s", exc)
        error_occurred = True
        yield {"type": "error", "error": f"Error interno: {exc}"}
    finally:
        # Always bill for what was consumed, even on cancel/error.
        cost = calculate_cost(total_input_tokens, total_output_tokens, DEMO_MODEL)
        if total_input_tokens or total_output_tokens:
            await _apply_usage_and_save(session, total_input_tokens, total_output_tokens, cost)

        if accumulated_files:
            assistant_text_for_history = (
                f"(Demo) Generated {len(accumulated_files)} file(s): "
                + ", ".join(accumulated_files.keys())
            )
            await _persist_files_and_history(
                session, accumulated_files, prompt, assistant_text_for_history
            )
        elif completed_normally and assistant_text_for_history:
            # chat-only path already persisted above
            pass
