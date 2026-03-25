import json
import logging
from decimal import Decimal

from asgiref.sync import sync_to_async
from django.http import StreamingHttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser

from apps.billing.plans import PLAN_DEFINITIONS
from apps.billing.services import get_balance
from apps.billing.throttles import PlanBasedDailyThrottle
from apps.projects.models import Project

from .serializers import EstimateRequestSerializer, GenerateRequestSerializer
from .services import stream_generation
from .providers.openai import calculate_cost, PRICING

logger = logging.getLogger(__name__)


@csrf_exempt
async def generate_view(request):
    """
    POST /api/generate/
    Async streaming SSE view — proxies to OpenAI, deducts credits.

    Authentication and throttling are handled manually since this is
    a raw async Django view (not a DRF APIView).
    """
    if request.method != "POST":
        return StreamingHttpResponse(
            _sse_error("Method not allowed"), status=405,
            content_type="text/event-stream",
        )

    # --- Auth check ---
    user = await sync_to_async(lambda: request.user)()
    is_authenticated = await sync_to_async(lambda: user.is_authenticated)()
    if not is_authenticated:
        return StreamingHttpResponse(
            _sse_error("Authentication required"),
            status=401,
            content_type="text/event-stream",
        )

    # --- Onboarding check ---
    has_onboarding = await sync_to_async(lambda: user.has_completed_onboarding)()
    if not has_onboarding:
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
    model = data.get("model", "gpt-5.4")

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

    # --- Check file_map size against plan ---
    plan = await sync_to_async(lambda: getattr(user, "plan", None))()
    plan_type = plan.plan_type if plan else "free"
    max_kb = PLAN_DEFINITIONS.get(plan_type, {}).get("max_file_map_kb", 500)
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

    # --- Stream response ---
    async def event_stream():
        async for chunk in stream_generation(
            user=user,
            project=project,
            prompt=prompt,
            chat_history=chat_history,
            model=model,
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

    user = await sync_to_async(lambda: request.user)()
    is_authenticated = await sync_to_async(lambda: user.is_authenticated)()
    if not is_authenticated:
        from django.http import JsonResponse
        return JsonResponse({"error": "Authentication required"}, status=401)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        from django.http import JsonResponse
        return JsonResponse({"error": "Invalid JSON body"}, status=400)

    serializer = EstimateRequestSerializer(data=body)
    if not serializer.is_valid():
        from django.http import JsonResponse
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
        from django.http import JsonResponse
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

    model = "gpt-5.4"
    pricing = PRICING.get(model, PRICING["gpt-5.4"])
    input_cost = (Decimal(estimated_input_tokens) / Decimal("1000000")) * pricing["input_per_million"]
    min_output_cost = (Decimal(estimated_output_min) / Decimal("1000000")) * pricing["output_per_million"]
    max_output_cost = (Decimal(estimated_output_max) / Decimal("1000000")) * pricing["output_per_million"]

    balance = await sync_to_async(get_balance)(user)

    from django.http import JsonResponse
    return JsonResponse({
        "inputTokens": estimated_input_tokens,
        "inputCost": float(input_cost),
        "estimatedOutputMin": estimated_output_min,
        "estimatedOutputMax": estimated_output_max,
        "estimatedCostMin": float(input_cost + min_output_cost),
        "estimatedCostMax": float(input_cost + max_output_cost),
        "currentBalance": float(balance),
    })


def _sse_error(message: str):
    """Helper to yield a single SSE error event."""
    data = json.dumps({"type": "error", "error": message})
    return f"data: {data}\n\n"
