import json
import logging
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
    if balance < MIN_COST_ESTIMATE:
        yield {"type": "error", "error": "Insufficient credits. Please upgrade your plan or purchase more credits."}
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
    generation = await _create_generation(user, project, prompt, model, file_map or {})

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
        )


# --- Async DB helpers (sync_to_async wrappers) ---


@sync_to_async
def _create_generation(user, project, prompt, model, file_map_snapshot=None):
    return Generation.objects.create(
        user=user,
        project=project,
        prompt=prompt,
        model=model,
        file_map_snapshot=file_map_snapshot,
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
):
    """Handle billing and record updates after streaming ends (normally, cancelled, or error)."""

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
        if actual_cost > 0:
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
        if actual_cost > 0:
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

        await _create_message(project=project, role="user", content=prompt, message_type="chat")
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
        if actual_cost > 0:
            await sync_to_async(consume_credits)(
                user,
                actual_cost,
                description=f"Chat #{generation.id}: {prompt[:100]}",
                generation_id=generation.id,
            )

        await _create_message(project=project, role="user", content=prompt, message_type="chat")
        await _create_message(
            project=project,
            role="assistant",
            content=chat_text,
            message_type="chat",
            usage=usage_data,
        )

    else:
        generation.status = "no_changes"

    await _save_generation(generation)
