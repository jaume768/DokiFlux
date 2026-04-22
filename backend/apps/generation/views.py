import json
import logging
from decimal import Decimal

from asgiref.sync import sync_to_async
from django.http import JsonResponse, StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt

from apps.billing.plans import PLAN_DEFINITIONS
from apps.billing.services import get_balance
from apps.projects.models import Project

from .models import Generation
from .serializers import EstimateRequestSerializer, GenerateRequestSerializer
from .services import stream_generation, stream_phased_generation
from .throttles import check_daily_generate_limit

MAX_CONCURRENT_GENERATIONS = 2
from .providers.registry import get_model_config, list_models, MODEL_REGISTRY, DEFAULT_MODEL, COST_MARKUP

logger = logging.getLogger(__name__)


@csrf_exempt
async def generate_view(request):
    """
    POST /api/generate/

    Authentication and throttling are handled manually since this is
    a raw async Django view (not a DRF APIView).
    """
    if request.method != "POST":
        return StreamingHttpResponse(
            _sse_error("Method not allowed"), status=405,
            content_type="text/event-stream",
        )

    # --- Auth check ---
    user = request.user
    if not user.is_authenticated:
        return StreamingHttpResponse(
            _sse_error("Authentication required"),
            status=401,
            content_type="text/event-stream",
        )

    # --- Onboarding check ---
    if not user.has_completed_onboarding:
        return StreamingHttpResponse(
            _sse_error("Please complete onboarding first (set your username)."),
            status=403,
            content_type="text/event-stream",
        )

    # --- Parse body ---
    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return StreamingHttpResponse(
            _sse_error("Invalid JSON body"),
            status=400,
            content_type="text/event-stream",
        )

    serializer = GenerateRequestSerializer(data=body)
    is_valid = serializer.is_valid()
    if not is_valid:
        errors = str(serializer.errors)
        return StreamingHttpResponse(
            _sse_error(f"Validation error: {errors}"),
            status=400,
            content_type="text/event-stream",
        )

    data = serializer.validated_data
    project_id = data["project_id"]
    prompt = data["prompt"]
    chat_history = data.get("chat_history", [])
    model = data.get("model", DEFAULT_MODEL)
    mode = data.get("mode", "phased")
    is_autofix = data.get("is_autofix", False)

    # --- Verify project ownership ---
    try:
        project = await sync_to_async(
            Project.objects.get
        )(id=project_id, user=user)
    except Project.DoesNotExist:
        return StreamingHttpResponse(
            _sse_error("Project not found"),
            status=404,
            content_type="text/event-stream",
        )

    # --- Concurrent generation limit (autofix exempt) ---
    if not is_autofix:
        active_count = await sync_to_async(
            lambda: Generation.objects.filter(
                project__user=user, status__in=["pending", "streaming"]
            ).count()
        )()
        if active_count >= MAX_CONCURRENT_GENERATIONS:
            return StreamingHttpResponse(
                _sse_error(
                    f"Ya tienes {MAX_CONCURRENT_GENERATIONS} generaciones en curso. "
                    "Espera a que terminen antes de iniciar otra."
                ),
                status=429,
                content_type="text/event-stream",
            )

    # --- Check plan limits (file size + daily message throttle) ---
    plan = await sync_to_async(lambda: getattr(user, "plan", None))()
    plan_type = plan.plan_type if plan else "free"
    plan_def = PLAN_DEFINITIONS.get(plan_type, {})
    max_kb = plan_def.get("max_file_map_kb", 500)
    daily_limit = plan_def.get("messages_per_day", 7)

    # --- Premium-only model gating ---
    from .providers.registry import MODEL_REGISTRY
    model_cfg = MODEL_REGISTRY.get(model, {})
    if model_cfg.get("premium_only") and plan_type != "premium":
        return StreamingHttpResponse(
            _sse_error(
                f"El modelo '{model_cfg.get('display_name', model)}' solo está "
                "disponible en el plan Premium. Mejora tu plan para usarlo."
            ),
            status=402,
            content_type="text/event-stream",
        )

    # --- Premium-only framework gating ---
    PREMIUM_FRAMEWORKS = {"vue", "nextjs"}
    project_framework = await sync_to_async(lambda: getattr(project, "framework", "react") or "react")()
    if project_framework in PREMIUM_FRAMEWORKS and plan_type != "premium":
        fw_names = {"vue": "Vue 3 + Vite", "nextjs": "Next.js"}
        fw_label = fw_names.get(project_framework, project_framework)
        return StreamingHttpResponse(
            _sse_error(
                f"El framework '{fw_label}' solo está disponible en el plan Premium. "
                "Mejora tu plan para usarlo."
            ),
            status=402,
            content_type="text/event-stream",
        )

    if not is_autofix:
        file_map_size = await sync_to_async(lambda: project.file_map_size_kb)()
        if file_map_size > max_kb:
            return StreamingHttpResponse(
                _sse_error(
                    f"Project file_map ({file_map_size:.0f} KB) exceeds your "
                    f"plan limit ({max_kb} KB). Please reduce project size or upgrade."
                ),
                status=400,
                content_type="text/event-stream",
            )

    # --- Daily generation throttle (autofix exempt — never bills, always allowed) ---
    if not is_autofix and await check_daily_generate_limit(user.id, daily_limit):
        return StreamingHttpResponse(
            _sse_error(
                f"Daily generation limit reached ({daily_limit} messages/day on your plan). "
                "Upgrade to premium for more."
            ),
            status=429,
            content_type="text/event-stream",
        )

    # --- Stream response ---
    generator_fn = stream_phased_generation if mode == "phased" else stream_generation

    async def event_stream():
        async for chunk in generator_fn(
            user=user,
            project=project,
            prompt=prompt,
            chat_history=chat_history,
            model=model,
            is_autofix=is_autofix,
        ):
            data_str = json.dumps(chunk)
            yield f"data: {data_str}\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


@csrf_exempt
async def estimate_view(request):
    """
    POST /api/estimate/
    Returns estimated cost range for a generation.
    """
    if request.method != "POST":
        return StreamingHttpResponse(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            content_type="application/json",
        )

    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    serializer = EstimateRequestSerializer(data=body)
    if not serializer.is_valid():
        return JsonResponse({"error": serializer.errors}, status=400)

    data = serializer.validated_data
    project_id = data["project_id"]
    prompt = data["prompt"]
    chat_history = data.get("chat_history", [])

    # Verify project ownership
    try:
        project = await sync_to_async(
            Project.objects.get
        )(id=project_id, user=user)
    except Project.DoesNotExist:
        return JsonResponse({"error": "Project not found"}, status=404)

    # Rough token estimation
    file_map = await sync_to_async(lambda: project.file_map)()
    current_project_text = ""
    if file_map:
        current_project_text = "\n\n".join(
            f"// --- FILE: {path} ---\n{content}"
            for path, content in file_map.items()
        )

    # Approximate: 1 token ~ 4 chars
    total_input_chars = (
        len(prompt)
        + len(current_project_text)
        + sum(len(m.get("content", "")) for m in chat_history)
        + 2000  # system prompt overhead
    )
    estimated_input_tokens = total_input_chars // 4

    has_history = len(chat_history) > 0 or bool(file_map)
    estimated_output_min = 300 if has_history else 800
    estimated_output_max = 31000

    model = body.get("model", DEFAULT_MODEL)
    if model not in MODEL_REGISTRY:
        model = DEFAULT_MODEL
    config = get_model_config(model)
    estimated_output_max = config["max_output_tokens"]
    input_cost = (Decimal(estimated_input_tokens) / Decimal("1000000")) * config["input_per_million"] * COST_MARKUP
    min_output_cost = (Decimal(estimated_output_min) / Decimal("1000000")) * config["output_per_million"] * COST_MARKUP
    max_output_cost = (Decimal(estimated_output_max) / Decimal("1000000")) * config["output_per_million"] * COST_MARKUP

    balance = await sync_to_async(get_balance)(user)

    return JsonResponse({
        "inputTokens": estimated_input_tokens,
        "inputCost": float(input_cost),
        "estimatedOutputMin": estimated_output_min,
        "estimatedOutputMax": estimated_output_max,
        "estimatedCostMin": float(input_cost + min_output_cost),
        "estimatedCostMax": float(input_cost + max_output_cost),
        "currentBalance": float(balance),
    })


@csrf_exempt
async def models_view(request):
    """
    GET /api/models/
    Returns list of available AI models with pricing info.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    return JsonResponse({"models": list_models(), "default": DEFAULT_MODEL})


@csrf_exempt
async def generation_status_view(request, generation_id: int):
    """
    GET /api/generate/status/<generation_id>/
    Returns status of a generation (for polling during background generation).
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    from .models import Generation

    try:
        generation = await sync_to_async(
            Generation.objects.select_related("project").get
        )(id=generation_id, user=user)
    except Generation.DoesNotExist:
        return JsonResponse({"error": "Generation not found"}, status=404)

    response_data = {
        "id": generation.id,
        "status": generation.status,
        "input_tokens": generation.input_tokens,
        "output_tokens": generation.output_tokens,
        "cost": float(generation.cost),
        "files_changed": generation.files_changed,
        "created_at": generation.created_at.isoformat(),
        "completed_at": generation.completed_at.isoformat() if generation.completed_at else None,
    }

    # If completed, include the result file_map
    if generation.status == "completed" and generation.result_file_map:
        response_data["result_file_map"] = generation.result_file_map

    return JsonResponse(response_data)


@csrf_exempt
async def active_generation_view(request, project_id: int):
    """
    GET /api/projects/<project_id>/active-generation/
    Returns the active (pending/streaming) generation for a project, if any.
    """
    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    from .models import Generation

    generation = await sync_to_async(
        lambda: Generation.objects.filter(
            project_id=project_id,
            user=user,
            status__in=["pending", "streaming"]
        ).order_by("-created_at").first()
    )()

    if not generation:
        return JsonResponse({"active": False})

    return JsonResponse({
        "active": True,
        "generation_id": generation.id,
        "status": generation.status,
        "created_at": generation.created_at.isoformat(),
    })


@csrf_exempt
async def cancel_generation_view(request, generation_id: int):
    """
    POST /api/generate/<generation_id>/cancel/
    Cancels an active (pending/streaming) background generation.
    Revokes the Celery task if a task ID is stored.
    """
    if request.method != "POST":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    user = request.user
    if not user.is_authenticated:
        return JsonResponse({"error": "Authentication required"}, status=401)

    from .models import Generation

    try:
        generation = await sync_to_async(
            Generation.objects.get
        )(id=generation_id, user=user)
    except Generation.DoesNotExist:
        return JsonResponse({"error": "Generation not found"}, status=404)

    if generation.status not in ("pending", "streaming"):
        return JsonResponse({"error": f"Generation is already {generation.status}"}, status=400)

    # Flip DB status FIRST so that if the worker is still alive it sees the
    # cancellation at its next between-files checkpoint and exits via its
    # own `finally` (which handles billing cleanly).
    from django.utils.timezone import now as _now
    generation.status = "cancelled"
    generation.completed_at = _now()
    await sync_to_async(generation.save)(update_fields=["status", "completed_at"])

    # Revoke the Celery task if we have its ID. SIGTERM may kill the worker
    # before it reaches its finally block, which is exactly why we persist
    # token usage to the Generation row after every phase in tasks.py.
    if generation.celery_task_id:
        try:
            from celery.app import app_or_default
            celery_app = app_or_default()
            await sync_to_async(celery_app.control.revoke)(
                generation.celery_task_id, terminate=True, signal="SIGTERM"
            )
        except Exception as exc:
            logger.warning("Failed to revoke Celery task %s: %s", generation.celery_task_id, exc)

    # Bill the user for tokens already consumed, using the snapshot the task
    # persisted on its last phase boundary. Idempotent: if the task's finally
    # already created a CreditTransaction for this generation, skip.
    await sync_to_async(_charge_cancelled_generation)(generation, user)

    # Refresh once more so we return the most up-to-date usage snapshot
    # (the worker may have persisted more tokens between our first save
    # above and the billing call).
    await sync_to_async(generation.refresh_from_db)()

    logger.info("Generation %s cancelled by user %s", generation_id, user.email)
    return JsonResponse({
        "cancelled": True,
        "generation_id": generation_id,
        "cost": float(generation.cost or 0),
        "input_tokens": generation.input_tokens or 0,
        "output_tokens": generation.output_tokens or 0,
    })


def _charge_cancelled_generation(generation, user):
    """Deduct credits for the tokens already persisted on the Generation row,
    unless a transaction for this generation already exists (idempotent)."""
    from apps.billing.models import CreditTransaction
    from apps.billing.services import consume_credits

    # Refresh to pick up any updates the worker wrote right before dying.
    generation.refresh_from_db()

    if generation.is_autofix:
        return
    if CreditTransaction.objects.filter(generation_id=generation.id).exists():
        # Worker already billed (either normal completion or its own cancel path).
        return

    cost = generation.cost or Decimal("0")
    if cost <= 0:
        return

    consume_credits(
        user=user,
        amount=cost,
        description=f"Cancelled gen #{generation.id}: {generation.prompt[:100]}",
        generation_id=generation.id,
    )
    logger.info(
        "Cancelled generation %s billed %s (%s in / %s out tokens)",
        generation.id, cost, generation.input_tokens, generation.output_tokens,
    )


def _sse_error(message: str):
    """Helper to yield a single SSE error event."""
    data = json.dumps({"type": "error", "error": message})
    return iter([f"data: {data}\n\n"])
