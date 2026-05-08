"""
Celery tasks for background generation.
"""
import logging
from decimal import Decimal

from celery import shared_task
from django.utils.timezone import now

from apps.billing.services import consume_credits
from apps.projects.models import ChatMessage
from .models import Generation
from .services import get_provider, build_messages, _build_file_messages, _extract_file_content, _get_file_from_code
from .providers.registry import get_model_config, calculate_cost

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=1, ignore_result=True, time_limit=30)
def generate_project_title_task(self, project_id: int, prompt: str):
    """
    Generate an AI title for a newly created project.
    Runs in background so project creation is instant.
    Falls back gracefully — never raises, never blocks.
    """
    import asyncio
    from apps.projects.models import Project as ProjectModel
    from .services import generate_ai_title

    def run(coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    try:
        title = run(generate_ai_title(prompt))
        if title:
            ProjectModel.objects.filter(id=project_id).update(name=title)
            logger.info("AI title set for project %s: %s", project_id, title)
    except Exception:
        logger.warning("AI title generation failed for project %s — keeping default", project_id)


@shared_task(bind=True, max_retries=0, time_limit=600)
def run_background_generation(self, generation_id: int):
    """
    Execute generation in background when client disconnects.
    This task runs the full phased generation flow synchronously.
    """
    import asyncio

    try:
        generation = Generation.objects.select_related("user", "project").get(id=generation_id)
    except Generation.DoesNotExist:
        logger.error("Generation %s not found for background task", generation_id)
        return

    if generation.status not in ("pending", "streaming"):
        logger.info("Generation %s already has status %s, skipping", generation_id, generation.status)
        return

    user = generation.user
    project = generation.project
    prompt = generation.prompt
    model = generation.model
    chat_history = generation.chat_history_cache or []
    is_autofix = generation.is_autofix

    file_map = project.file_map or {}
    framework = getattr(project, "framework", "react") or "react"
    current_project = (
        "\n\n".join(f"// --- FILE: {p} ---\n{c}" for p, c in file_map.items())
        if file_map else None
    )

    from .services import _serialize_project_assets

    project_assets = _serialize_project_assets(project)
    messages = build_messages(prompt, current_project, chat_history, framework=framework, project_assets=project_assets)
    provider = get_provider(model)
    model_config = get_model_config(model)
    # Mirror of services.py: 24k cap to avoid mid-file truncation.
    file_max_tokens = min(model_config["max_output_tokens"], 44000)

    total_input_tokens = 0
    total_output_tokens = 0
    accumulated_files: dict = {}

    def run(coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    # Flags that drive the final billing step in the `finally` block so that
    # cancellation (user clicked "stop") still charges for tokens actually used.
    was_cancelled = False
    completed_normally = False

    def _persist_usage():
        """Persist the current token counters to DB so cancel_generation_view
        (or a hard worker kill) can still bill the user for what was already
        spent. Called after every phase boundary that could be interrupted."""
        cost_now = calculate_cost(total_input_tokens, total_output_tokens, model)
        generation.input_tokens = total_input_tokens
        generation.output_tokens = total_output_tokens
        generation.cost = cost_now
        generation.save(update_fields=["input_tokens", "output_tokens", "cost"])

    try:
        # Check if already cancelled before starting
        generation.refresh_from_db(fields=["status"])
        if generation.status == "cancelled":
            logger.info("Generation %s was cancelled before task started", generation_id)
            was_cancelled = True
            return

        generation.status = "streaming"
        generation.save(update_fields=["status"])

        # 1. Planning phase
        plan = run(provider.call_planner(messages, model))

        plan_usage = plan.get("usage", {})
        total_input_tokens += plan_usage.get("inputTokens", 0)
        total_output_tokens += plan_usage.get("outputTokens", 0)
        _persist_usage()

        files = plan.get("files", [])

        if not files:
            # No files to generate - mark complete without changes
            generation.status = "no_changes"
            generation.completed_at = now()
            generation.save(update_fields=["status", "completed_at"])
            completed_normally = True
            return

        # Ensure entry-point files (App.tsx / index.tsx / main.tsx) are generated
        # last so their imports reference files that already exist in context.
        from .services import _sort_files_for_generation
        files = _sort_files_for_generation(files)

        # 2. Per-file generation
        for file_path in files:
            # Check for cancellation between files
            generation.refresh_from_db(fields=["status"])
            if generation.status == "cancelled":
                logger.info("Generation %s cancelled mid-run, stopping at file %s", generation_id, file_path)
                was_cancelled = True
                return

            already_gen_ctx = (
                "\n\n".join(f"// --- FILE: {p} ---\n{c}" for p, c in accumulated_files.items())
                if accumulated_files else None
            )

            file_messages = _build_file_messages(
                prompt=prompt,
                file_path=file_path,
                current_project=current_project,
                already_generated=already_gen_ctx,
                chat_history=chat_history,
                framework=framework,
                project_assets=project_assets,
            )

            file_raw = ""

            async def collect_file():
                nonlocal file_raw, total_input_tokens, total_output_tokens
                async for chunk in provider.stream_generate(
                    file_messages, model=model, max_tokens=file_max_tokens
                ):
                    if chunk.get("type") == "text":
                        file_raw += chunk.get("content", "")
                    elif chunk.get("type") == "usage":
                        u = chunk.get("usage", {})
                        total_input_tokens += u.get("inputTokens", 0)
                        total_output_tokens += u.get("outputTokens", 0)

            run(collect_file())

            # Persist updated usage so it is billable even if the worker is
            # killed before the next checkpoint.
            _persist_usage()

            code_with_marker = _extract_file_content(file_raw)
            if code_with_marker:
                content_only = _get_file_from_code(code_with_marker, file_path)
                if content_only.strip():
                    accumulated_files[file_path] = content_only

        if not accumulated_files:
            generation.status = "no_changes"
            generation.completed_at = now()
            generation.save(update_fields=["status", "completed_at"])
            completed_normally = True
            return

        # 2b. Cross-file review phase — only when ≥2 files were produced.
        if len(accumulated_files) >= 2:
            from .providers.prompts import build_reviewer_messages
            from .services import _parse_review_patches

            review_messages = build_reviewer_messages(
                user_prompt=prompt,
                all_files=accumulated_files,
                framework=framework,
            )
            review_raw = ""

            async def collect_review():
                nonlocal review_raw, total_input_tokens, total_output_tokens
                async for chunk in provider.stream_generate(
                    review_messages, model=model, max_tokens=file_max_tokens
                ):
                    if chunk.get("type") == "text":
                        review_raw += chunk.get("content", "")
                    elif chunk.get("type") == "usage":
                        u = chunk.get("usage", {})
                        total_input_tokens += u.get("inputTokens", 0)
                        total_output_tokens += u.get("outputTokens", 0)

            try:
                run(collect_review())
            except Exception as exc:
                logger.warning("Background review phase failed (non-fatal): %s", exc)
                review_raw = ""

            review_text = _extract_file_content(review_raw) if review_raw else ""
            patches = _parse_review_patches(review_text, accumulated_files)
            if patches:
                logger.info(
                    "Background review patched %s file(s) for gen %s: %s",
                    len(patches), generation_id, list(patches.keys()),
                )
            for patched_path, new_content in patches.items():
                accumulated_files[patched_path] = new_content

        # 2c. Free aggressive fix iteration — mirrors stream_phased_generation.
        #     First generation of the chat (no prior assistant in chat_history)
        #     and not an auto-fix retry. Tokens absorbed, NOT billed.
        has_prior_assistant = any(
            (m.get("role") == "assistant") for m in (chat_history or [])
        )
        bg_is_first_gen = (
            not is_autofix
            and not has_prior_assistant
            and bool(accumulated_files)
        )
        logger.info(
            "[bg fix_iteration] generation=%s decision is_autofix=%s has_prior_assistant=%s "
            "files=%s -> is_first_gen=%s",
            generation_id, is_autofix, has_prior_assistant,
            len(accumulated_files), bg_is_first_gen,
        )
        if bg_is_first_gen:
            from .providers.prompts import build_fix_iteration_messages
            from .services import _parse_review_patches

            fix_messages = build_fix_iteration_messages(
                user_prompt=prompt,
                all_files=accumulated_files,
                framework=framework,
            )
            fix_raw = ""
            fix_input_tokens = 0
            fix_output_tokens = 0

            async def collect_fix():
                nonlocal fix_raw, fix_input_tokens, fix_output_tokens
                async for chunk in provider.stream_generate(
                    fix_messages, model=model, max_tokens=file_max_tokens
                ):
                    if chunk.get("type") == "text":
                        fix_raw += chunk.get("content", "")
                    elif chunk.get("type") == "usage":
                        u = chunk.get("usage", {})
                        fix_input_tokens += u.get("inputTokens", 0)
                        fix_output_tokens += u.get("outputTokens", 0)

            try:
                run(collect_fix())
            except Exception as exc:
                logger.warning("Background fix iteration failed (non-fatal): %s", exc)
                fix_raw = ""

            fix_text = _extract_file_content(fix_raw) if fix_raw else ""
            fix_patches = _parse_review_patches(fix_text, accumulated_files)

            # Same truncation safety as foreground flow.
            fix_raw_stripped = (fix_raw or "").rstrip()
            raw_looks_truncated = bool(fix_raw_stripped) and not fix_raw_stripped.endswith(
                (")", "}", ">", ";", "`", "\"", "'", "]")
            )
            safe_patches = {}
            for patched_path, new_content in fix_patches.items():
                original = accumulated_files.get(patched_path, "")
                size_suspicious = (
                    len(original) >= 500
                    and len(new_content) < int(len(original) * 0.7)
                )
                content_looks_truncated = not new_content.rstrip().endswith(
                    (")", "}", ">", ";", "`", "\"", "'", "]")
                )
                if raw_looks_truncated and (size_suspicious or content_looks_truncated):
                    logger.warning(
                        "[bg fix_iteration] skipping patch for %s — looks truncated",
                        patched_path,
                    )
                    continue
                safe_patches[patched_path] = new_content

            if safe_patches:
                logger.info(
                    "Background fix iteration patched %s file(s) for gen %s: %s",
                    len(safe_patches), generation_id, list(safe_patches.keys()),
                )
            for patched_path, new_content in safe_patches.items():
                accumulated_files[patched_path] = new_content

            absorbed_cost = calculate_cost(fix_input_tokens, fix_output_tokens, model)
            logger.info(
                "[bg fix_iteration] generation=%s absorbed tokens in=%s out=%s cost=%s",
                generation_id, fix_input_tokens, fix_output_tokens, absorbed_cost,
            )

        # 3. Merge and save project
        merged_file_map = {**file_map, **accumulated_files}
        project.file_map = merged_file_map
        project.save(update_fields=["file_map"])

        # 4. Finalize generation record
        cost = calculate_cost(total_input_tokens, total_output_tokens, model)
        generation.status = "completed"
        generation.completed_at = now()
        generation.input_tokens = total_input_tokens
        generation.output_tokens = total_output_tokens
        generation.cost = cost
        generation.files_changed = len(accumulated_files)
        generation.result_file_map = merged_file_map
        generation.save()

        # 5. Consume credits (unless autofix)
        if cost > 0 and not is_autofix:
            consume_credits(
                user,
                cost,
                description=f"Background gen #{generation.id}: {prompt[:100]}",
                generation_id=generation.id,
            )

        # 6. Create assistant ChatMessage so it appears in chat history —
        # except for autofix, which is a silent background recovery.
        usage_data = {
            "inputTokens": total_input_tokens,
            "outputTokens": total_output_tokens,
            "cost": float(cost),
        }
        if not is_autofix:
            ChatMessage.objects.create(
                project=project,
                role="assistant",
                content=f"Generated code ({total_input_tokens} input, {total_output_tokens} output tokens)",
                message_type="code",
                usage=usage_data,
                raw_code="",
                generation_id=generation.id,
            )

        logger.info("Background generation %s completed (%s files)", generation_id, len(accumulated_files))
        completed_normally = True

    except Exception:
        logger.exception("Background generation %s failed", generation_id)
        generation.status = "failed"
        generation.completed_at = now()
        generation.save(update_fields=["status", "completed_at"])

    finally:
        # If we exited due to user cancellation (detected via refresh_from_db
        # check between phases) and actually consumed tokens, bill for them.
        # The foreground path already handles this in services._finalize_generation,
        # but the background task used to just `return` without charging.
        if was_cancelled and not is_autofix:
            try:
                generation.refresh_from_db(fields=["status", "cost"])
                final_cost = calculate_cost(total_input_tokens, total_output_tokens, model)
                # Update record with final usage/cost for the cancel path.
                generation.input_tokens = total_input_tokens
                generation.output_tokens = total_output_tokens
                generation.cost = final_cost
                if generation.status != "cancelled":
                    generation.status = "cancelled"
                if not generation.completed_at:
                    generation.completed_at = now()
                generation.save(update_fields=[
                    "input_tokens", "output_tokens", "cost", "status", "completed_at",
                ])

                if final_cost > 0:
                    consume_credits(
                        user,
                        final_cost,
                        description=f"Cancelled bg gen #{generation.id}: {prompt[:100]}",
                        generation_id=generation.id,
                    )
                    logger.info(
                        "Background generation %s cancelled — billed %s for %s input / %s output tokens",
                        generation_id, final_cost, total_input_tokens, total_output_tokens,
                    )
            except Exception:
                logger.exception(
                    "Failed to bill cancelled background generation %s", generation_id,
                )
