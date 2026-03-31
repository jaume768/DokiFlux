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
    current_project = (
        "\n\n".join(f"// --- FILE: {p} ---\n{c}" for p, c in file_map.items())
        if file_map else None
    )

    messages = build_messages(prompt, current_project, chat_history)
    provider = get_provider(model)
    model_config = get_model_config(model)
    file_max_tokens = min(model_config["max_output_tokens"], 12000)

    total_input_tokens = 0
    total_output_tokens = 0
    accumulated_files: dict = {}

    def run(coro):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(coro)
        finally:
            loop.close()

    try:
        # Check if already cancelled before starting
        generation.refresh_from_db(fields=["status"])
        if generation.status == "cancelled":
            logger.info("Generation %s was cancelled before task started", generation_id)
            return

        generation.status = "streaming"
        generation.save(update_fields=["status"])

        # 1. Planning phase
        plan = run(provider.call_planner(messages, model))

        plan_usage = plan.get("usage", {})
        total_input_tokens += plan_usage.get("inputTokens", 0)
        total_output_tokens += plan_usage.get("outputTokens", 0)

        files = plan.get("files", [])

        if not files:
            # No files to generate - mark complete without changes
            generation.status = "no_changes"
            generation.completed_at = now()
            generation.save(update_fields=["status", "completed_at"])
            return

        # 2. Per-file generation
        for file_path in files:
            # Check for cancellation between files
            generation.refresh_from_db(fields=["status"])
            if generation.status == "cancelled":
                logger.info("Generation %s cancelled mid-run, stopping at file %s", generation_id, file_path)
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

            code_with_marker = _extract_file_content(file_raw)
            if code_with_marker:
                content_only = _get_file_from_code(code_with_marker, file_path)
                if content_only.strip():
                    accumulated_files[file_path] = content_only

        if not accumulated_files:
            generation.status = "no_changes"
            generation.completed_at = now()
            generation.save(update_fields=["status", "completed_at"])
            return

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

        # 6. Create assistant ChatMessage so it appears in chat history
        usage_data = {
            "inputTokens": total_input_tokens,
            "outputTokens": total_output_tokens,
            "cost": float(cost),
        }
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

    except Exception:
        logger.exception("Background generation %s failed", generation_id)
        generation.status = "failed"
        generation.completed_at = now()
        generation.save(update_fields=["status", "completed_at"])
