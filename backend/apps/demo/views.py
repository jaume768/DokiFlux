"""Public demo endpoints — no auth required (except /migrate/)."""
import json
import logging
import uuid
from datetime import timedelta
from decimal import Decimal

from asgiref.sync import sync_to_async
from django.http import JsonResponse, StreamingHttpResponse
from django.utils.timezone import now
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DemoSession
from .serializers import (
    DemoGenerateSerializer,
    DemoSessionStateSerializer,
    DemoStartSerializer,
)
from .services import stream_demo_generation, DEMO_MODEL
from .utils import (
    DEMO_COOKIE_NAME,
    DEMO_INITIAL_CREDITS,
    DEMO_SIGNUP_BONUS_CREDITS,
    get_client_ip,
    hash_fingerprint,
    hash_ip,
    is_dev_mode,
    over_fingerprint_quota,
    over_ip_quota,
    set_demo_cookie,
)

logger = logging.getLogger(__name__)


def _sse_error(message: str, code: str = "error"):
    data = json.dumps({"type": "error", "error": message, "code": code})
    return iter([f"data: {data}\n\n"])


def _session_payload(session: DemoSession) -> dict:
    return {
        "session_id": str(session.session_id),
        "credits_remaining": str(session.credits_remaining),
        "file_map": session.file_map or {},
        "chat_history": session.chat_history or [],
        "framework": session.framework,
        "generation_count": session.generation_count,
        "migrated": session.is_migrated,
    }


class DemoStartView(APIView):
    """
    POST /api/demo/start/
    Body: { fingerprint?, prompt?, framework? }
    Reuses an existing unmigrated session for this browser (cookie) if one
    exists and still has credits; otherwise checks anti-abuse quotas and
    creates a new DemoSession.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = DemoStartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fingerprint = serializer.validated_data.get("fingerprint", "") or ""
        prompt = (serializer.validated_data.get("prompt") or "").strip()
        framework = serializer.validated_data.get("framework", "react")

        cookie_id = request.COOKIES.get(DEMO_COOKIE_NAME, "")
        existing: DemoSession | None = None
        if cookie_id:
            try:
                uuid.UUID(cookie_id)
                existing = DemoSession.objects.filter(
                    session_id=cookie_id, migrated_to_user__isnull=True
                ).first()
            except ValueError:
                existing = None

        dev_mode = is_dev_mode()
        reset_requested = dev_mode and request.query_params.get("reset") in ("1", "true")

        # In dev: if the existing session ran out of credits, refill it instead
        # of minting a new one. This lets you hammer the demo without cookie juggling.
        if existing and dev_mode:
            update_fields: list[str] = ["last_active_at"]
            if not existing.has_credits:
                existing.credits_remaining = Decimal(str(DEMO_INITIAL_CREDITS))
                update_fields.append("credits_remaining")
            if reset_requested:
                existing.file_map = {}
                existing.chat_history = []
                existing.generation_count = 0
                existing.total_input_tokens = 0
                existing.total_output_tokens = 0
                existing.credits_remaining = Decimal(str(DEMO_INITIAL_CREDITS))
                existing.initial_prompt = prompt[:1000] if prompt else ""
                update_fields.extend([
                    "file_map", "chat_history", "generation_count",
                    "total_input_tokens", "total_output_tokens",
                    "credits_remaining", "initial_prompt",
                ])
            elif prompt and not existing.initial_prompt:
                existing.initial_prompt = prompt[:1000]
                update_fields.append("initial_prompt")
            existing.save(update_fields=list(set(update_fields)))
            resp = Response(_session_payload(existing), status=status.HTTP_200_OK)
            set_demo_cookie(resp, existing.session_id)
            return resp

        # Reuse if cookie session still has budget
        if existing and existing.has_credits:
            if prompt and not existing.initial_prompt:
                existing.initial_prompt = prompt[:1000]
            existing.save(update_fields=["last_active_at", "initial_prompt"])
            resp = Response(_session_payload(existing), status=status.HTTP_200_OK)
            set_demo_cookie(resp, existing.session_id)
            return resp

        ip_hash = hash_ip(get_client_ip(request))
        fp_hash = hash_fingerprint(fingerprint)

        # Anti-abuse quotas (only when creating a brand-new session)
        if over_ip_quota(ip_hash):
            return Response(
                {
                    "error": "Has alcanzado el límite de demos gratuitas desde esta red. "
                             "Crea una cuenta gratis para seguir generando.",
                    "code": "ip_quota_exceeded",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        if over_fingerprint_quota(fp_hash):
            return Response(
                {
                    "error": "Ya has usado el modo demo en este navegador. "
                             "Crea una cuenta gratis para seguir.",
                    "code": "fingerprint_quota_exceeded",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        session = DemoSession.objects.create(
            ip_hash=ip_hash,
            fingerprint_hash=fp_hash,
            credits_remaining=Decimal(str(DEMO_INITIAL_CREDITS)),
            framework=framework,
            initial_prompt=prompt[:1000],
        )
        resp = Response(_session_payload(session), status=status.HTTP_201_CREATED)
        set_demo_cookie(resp, session.session_id)
        return resp


class DemoSessionView(APIView):
    """GET /api/demo/session/ — current demo session state by cookie."""

    authentication_classes = []
    permission_classes = []

    def get(self, request):
        cookie_id = request.COOKIES.get(DEMO_COOKIE_NAME, "")
        if not cookie_id:
            return Response({"error": "No demo session"}, status=status.HTTP_404_NOT_FOUND)
        try:
            session = DemoSession.objects.get(session_id=cookie_id)
        except (DemoSession.DoesNotExist, ValueError):
            return Response({"error": "No demo session"}, status=status.HTTP_404_NOT_FOUND)
        return Response(_session_payload(session), status=status.HTTP_200_OK)


class DemoResetView(APIView):
    """
    POST /api/demo/reset/  (dev-only)
    Wipes the current demo session's file_map, chat_history and refills credits.
    Disabled in production — returns 404 when DEMO_DEV_MODE is False.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        if not is_dev_mode():
            return Response({"error": "Not found"}, status=status.HTTP_404_NOT_FOUND)
        cookie_id = request.COOKIES.get(DEMO_COOKIE_NAME, "")
        if not cookie_id:
            return Response({"error": "No demo session"}, status=status.HTTP_404_NOT_FOUND)
        try:
            session = DemoSession.objects.get(session_id=cookie_id)
        except (DemoSession.DoesNotExist, ValueError):
            return Response({"error": "No demo session"}, status=status.HTTP_404_NOT_FOUND)

        session.file_map = {}
        session.chat_history = []
        session.generation_count = 0
        session.total_input_tokens = 0
        session.total_output_tokens = 0
        session.credits_remaining = Decimal(str(DEMO_INITIAL_CREDITS))
        session.migrated_to_user = None
        session.migrated_project_id = None
        session.migrated_at = None
        session.save()
        return Response(_session_payload(session), status=status.HTTP_200_OK)


@csrf_exempt
async def demo_generate_view(request):
    """
    POST /api/demo/generate/
    Streams SSE chunks for an anonymous demo generation.
    Forces model=claude-haiku-4.5 and charges DemoSession.credits_remaining.
    """
    if request.method != "POST":
        return StreamingHttpResponse(
            _sse_error("Method not allowed"),
            status=405,
            content_type="text/event-stream",
        )

    cookie_id = request.COOKIES.get(DEMO_COOKIE_NAME, "")
    if not cookie_id:
        return StreamingHttpResponse(
            _sse_error("No demo session — call /api/demo/start/ first", code="no_session"),
            status=401,
            content_type="text/event-stream",
        )

    try:
        uuid.UUID(cookie_id)
    except ValueError:
        return StreamingHttpResponse(
            _sse_error("Invalid demo session", code="invalid_session"),
            status=401,
            content_type="text/event-stream",
        )

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return StreamingHttpResponse(
            _sse_error("Invalid JSON body"),
            status=400,
            content_type="text/event-stream",
        )

    serializer = DemoGenerateSerializer(data=body)
    if not serializer.is_valid():
        return StreamingHttpResponse(
            _sse_error(f"Validation error: {serializer.errors}"),
            status=400,
            content_type="text/event-stream",
        )

    prompt = serializer.validated_data["prompt"]

    try:
        session = await sync_to_async(DemoSession.objects.get)(session_id=cookie_id)
    except DemoSession.DoesNotExist:
        return StreamingHttpResponse(
            _sse_error("Demo session not found", code="no_session"),
            status=404,
            content_type="text/event-stream",
        )

    if session.is_migrated:
        return StreamingHttpResponse(
            _sse_error(
                "Esta sesión demo ya ha sido migrada a tu cuenta. Usa la app.",
                code="already_migrated",
            ),
            status=410,
            content_type="text/event-stream",
        )

    if not session.has_credits:
        return StreamingHttpResponse(
            _sse_error(
                "Se te acabaron los créditos demo. Regístrate gratis y consigue +3€.",
                code="demo_credits_exhausted",
            ),
            status=402,
            content_type="text/event-stream",
        )

    # Basic per-session rate-limit: no more than 5 generations total (cheap guard).
    # Bypassed in dev mode so you can iterate freely on /demo while developing.
    if session.generation_count >= 3 and not is_dev_mode():
        return StreamingHttpResponse(
            _sse_error("Demo cap reached.", code="demo_cap_reached"),
            status=429,
            content_type="text/event-stream",
        )

    async def event_stream():
        async for chunk in stream_demo_generation(session=session, prompt=prompt):
            data_str = json.dumps(chunk)
            yield f"data: {data_str}\n\n"

    response = StreamingHttpResponse(
        event_stream(),
        content_type="text/event-stream",
    )
    response["Cache-Control"] = "no-cache"
    response["X-Accel-Buffering"] = "no"
    return response


class DemoMigrateView(APIView):
    """
    POST /api/demo/migrate/
    Auth required. Reads the demo_session cookie, creates a Project from
    the session's file_map + chat_history, and grants +3€ bonus credits.
    Idempotent: subsequent calls return the already-migrated project id.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        from apps.billing.models import CreditGrant, CreditTransaction
        from apps.billing.services import apply_to_debt
        from apps.projects.models import ChatMessage, Project

        cookie_id = request.COOKIES.get(DEMO_COOKIE_NAME, "")
        if not cookie_id:
            return Response(
                {"error": "No demo session cookie"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            session = DemoSession.objects.get(session_id=cookie_id)
        except (DemoSession.DoesNotExist, ValueError):
            return Response(
                {"error": "Demo session not found"},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Idempotent: already migrated?
        if session.is_migrated:
            return Response(
                {
                    "project_id": session.migrated_project_id,
                    "already_migrated": True,
                    "bonus_granted": False,
                },
                status=status.HTTP_200_OK,
            )

        user = request.user

        # Guard: if the demo has nothing generated, don't create an empty project
        # but still grant the bonus for completing signup with an active demo.
        file_map = session.file_map or {}
        chat_history = session.chat_history or []
        project_id = None

        if file_map:
            name = (session.initial_prompt or "Mi primer proyecto").strip()
            if len(name) > 60:
                name = name[:57] + "…"
            project = Project.objects.create(
                user=user,
                name=name or "Demo project",
                description=session.initial_prompt or "",
                framework=session.framework or "react",
                file_map=file_map,
                last_used_model=DEMO_MODEL,
            )
            project_id = project.id

            # Copy chat history into ChatMessage rows (chat-type).
            for msg in chat_history:
                role = msg.get("role")
                content = msg.get("content") or ""
                if role not in ("user", "assistant") or not content:
                    continue
                ChatMessage.objects.create(
                    project=project,
                    role=role,
                    content=content,
                    message_type="chat",
                )

        # No bonus on signup. Instead, deduct whatever the user already spent
        # during the anonymous demo so the final balance becomes:
        #   (free monthly grant) − (demo usage)
        # Users who signed up without using the demo are unaffected.
        from apps.billing.services import consume_credits
        from .utils import DEMO_INITIAL_CREDITS as _DEMO_INITIAL

        spent = Decimal(str(_DEMO_INITIAL)) - (session.credits_remaining or Decimal("0"))
        if spent < 0:
            spent = Decimal("0")
        bonus_granted = False  # no bonus anymore; kept in response shape for the FE
        if spent > 0:
            consume_credits(
                user,
                spent,
                description=f"Demo usage deducted on signup (spent {spent})",
            )

        session.migrated_to_user = user
        session.migrated_project_id = project_id
        session.migrated_at = now()
        session.save(update_fields=[
            "migrated_to_user", "migrated_project_id", "migrated_at",
        ])

        resp = Response(
            {
                "project_id": project_id,
                "already_migrated": False,
                "bonus_granted": bonus_granted,
            },
            status=status.HTTP_200_OK,
        )
        # Clear the cookie so subsequent demo_start creates a clean one.
        resp.delete_cookie(DEMO_COOKIE_NAME, path="/")
        return resp
