import json
import logging
from decimal import Decimal
from typing import AsyncGenerator, Any

from asgiref.sync import sync_to_async
from django.utils.timezone import now

from apps.billing.services import consume_credits, get_balance
from apps.projects.models import ChatMessage, Project

from .models import Generation
from .providers.openai import OpenAIProvider, calculate_cost, MAX_OUTPUT_TOKENS

logger = logging.getLogger(__name__)

# Conservative minimum cost estimate to pre-check credits
MIN_COST_ESTIMATE = Decimal("0.005")


def get_provider(model: str = "gpt-5.4"):
    """Factory: return the appropriate provider for the model."""
    # Future: route to AnthropicProvider, GoogleProvider, etc.
    return OpenAIProvider()


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

    # 4. Create Generation record
    generation = await _create_generation(user, project, prompt, model)

    # 5. Update status to streaming
    generation.status = "streaming"
    await _save_generation(generation)

    # 6. Stream from provider
    provider = get_provider(model)
    usage_data = None
    has_code = False
    has_chat = False
    full_code = ""
    chat_text = ""
    error_occurred = False

    async for chunk in provider.stream_generate(messages, model=model, max_tokens=MAX_OUTPUT_TOKENS):
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

        # Forward chunk to client
        yield chunk

    # 7. Post-stream: update Generation record and handle billing
    if error_occurred:
        generation.status = "failed"
        await _save_generation(generation)
        return

    if usage_data:
        generation.input_tokens = usage_data.get("inputTokens", 0)
        generation.output_tokens = usage_data.get("outputTokens", 0)
        generation.cost = Decimal(str(usage_data.get("cost", 0)))

    if has_code and full_code.strip():
        generation.status = "completed"
        generation.completed_at = now()

        # Deduct actual cost
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
                    generation.id,
                    user.email,
                    actual_cost,
                )

        # Save user message
        await _create_message(
            project=project,
            role="user",
            content=prompt,
            message_type="chat",
        )

        # Save assistant code message
        await _create_message(
            project=project,
            role="assistant",
            content=f"Generated code ({generation.input_tokens} input, {generation.output_tokens} output tokens)",
            message_type="code",
            usage=usage_data,
            raw_code=full_code,
        )
    elif has_chat:
        generation.status = "completed"
        generation.completed_at = now()

        # Chat-only: still costs tokens, deduct
        actual_cost = generation.cost
        if actual_cost > 0:
            await sync_to_async(consume_credits)(
                user,
                actual_cost,
                description=f"Chat #{generation.id}: {prompt[:100]}",
                generation_id=generation.id,
            )

        # Save user message
        await _create_message(
            project=project,
            role="user",
            content=prompt,
            message_type="chat",
        )

        # Save assistant chat message
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


# --- Async DB helpers (sync_to_async wrappers) ---

from asgiref.sync import sync_to_async


@sync_to_async
def _create_generation(user, project, prompt, model):
    return Generation.objects.create(
        user=user,
        project=project,
        prompt=prompt,
        model=model,
    )


@sync_to_async
def _save_generation(generation):
    generation.save()


@sync_to_async
def _create_message(project, role, content, message_type, usage=None, raw_code=""):
    return ChatMessage.objects.create(
        project=project,
        role=role,
        content=content,
        message_type=message_type,
        usage=usage,
        raw_code=raw_code,
    )
