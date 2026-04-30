from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.generation.models import Generation
from .models import ChatMessage, ContactRequest, Project, ProjectExportLog
from .permissions import IsProjectOwner
from .serializers import (
    ChatMessageSerializer,
    ContactRequestSerializer,
    ProjectCreateSerializer,
    ProjectDetailSerializer,
    ProjectListSerializer,
)


class ProjectListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/projects/      → list user's projects (no file_map)
    POST /api/projects/      → create a new project
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.method == "POST":
            return ProjectCreateSerializer
        return ProjectListSerializer

    def get_queryset(self):
        return (
            Project.objects.filter(user=self.request.user)
            .annotate(message_count=Count("messages"))
            .order_by("-updated_at")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # --- Premium-only framework gating ---
        PREMIUM_FRAMEWORKS = {"vue", "nextjs"}
        requested_framework = serializer.validated_data.get("framework", "react") or "react"
        plan_type = getattr(getattr(request.user, "plan", None), "plan_type", "free")
        if requested_framework in PREMIUM_FRAMEWORKS and plan_type != "premium":
            fw_names = {"vue": "Vue 3 + Vite", "nextjs": "Next.js"}
            fw_label = fw_names.get(requested_framework, requested_framework)
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied(
                f"El framework '{fw_label}' solo está disponible en el plan Premium."
            )

        self.perform_create(serializer)
        project = serializer.instance

        # Fire AI title generation in background using the prompt (sent as description)
        prompt = (request.data.get("description") or "").strip()
        if prompt:
            from apps.generation.tasks import generate_project_title_task
            generate_project_title_task.delay(project.id, prompt[:500])

        detail = ProjectDetailSerializer(project, context={"request": request})
        return Response(detail.data, status=status.HTTP_201_CREATED)


class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/projects/{id}/  → project detail with file_map
    PATCH  /api/projects/{id}/  → update name/description/file_map
    DELETE /api/projects/{id}/  → delete project and all messages
    """

    serializer_class = ProjectDetailSerializer
    permission_classes = [IsAuthenticated, IsProjectOwner]

    def get_queryset(self):
        return (
            Project.objects.filter(user=self.request.user)
            .annotate(message_count=Count("messages"))
        )

    def partial_update(self, request, *args, **kwargs):
        generation_id = request.data.get("generation_id")
        file_map = request.data.get("file_map")
        response = super().partial_update(request, *args, **kwargs)
        if generation_id and file_map:
            try:
                gen = Generation.objects.get(
                    id=generation_id,
                    project_id=kwargs["pk"],
                    project__user=request.user,
                )
                gen.result_file_map = file_map
                gen.save(update_fields=["result_file_map"])
            except Generation.DoesNotExist:
                pass
        return response


class ChatMessageListView(generics.ListAPIView):
    """
    GET /api/projects/{id}/messages/ → paginated chat history
    """

    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        project_id = self.kwargs["project_id"]
        return ChatMessage.objects.filter(
            project_id=project_id,
            project__user=self.request.user,
        )


class ProjectRestoreView(APIView):
    """
    POST /api/projects/{id}/restore/{generation_id}/
    Restores the project file_map to the snapshot saved before the given generation.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request, pk, generation_id):
        try:
            project = Project.objects.get(id=pk, user=request.user)
        except Project.DoesNotExist:
            return Response({"error": "Project not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            generation = Generation.objects.get(id=generation_id, project=project)
        except Generation.DoesNotExist:
            return Response({"error": "Generation not found"}, status=status.HTTP_404_NOT_FOUND)

        # Prefer the stored result_file_map (state AFTER this generation).
        # Fallback for older generations without result_file_map: use next gen's snapshot.
        if generation.result_file_map:
            result_file_map = generation.result_file_map
        else:
            next_gen = (
                Generation.objects.filter(
                    project=project,
                    created_at__gt=generation.created_at,
                    file_map_snapshot__isnull=False,
                )
                .order_by("created_at")
                .first()
            )
            if next_gen:
                result_file_map = next_gen.file_map_snapshot
            else:
                result_file_map = project.file_map or {}

        if not result_file_map:
            return Response(
                {"error": "No hay archivos para restaurar en esta generación"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        project.file_map = result_file_map
        project.save(update_fields=["file_map", "updated_at"])

        return Response({"file_map": result_file_map}, status=status.HTTP_200_OK)


class ContactRequestView(APIView):
    """POST /api/contact/  → create a lead + send email to sales.

    Accepts BOTH authenticated users (with optional project ref) and anonymous
    visitors from the landing page / pricing / footer. Anonymous submissions
    are rate-limited by IP in memory (via Redis cache)."""

    permission_classes = [AllowAny]

    def post(self, request):
        from datetime import timedelta
        from django.core.cache import cache
        from django.utils import timezone

        user = request.user if request.user.is_authenticated else None

        # Rate-limit anonymous submissions: 3/hour per IP.
        if user is None:
            remote_addr = (
                request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
                or request.META.get("REMOTE_ADDR", "unknown")
            )
            cache_key = f"contact:anon:{remote_addr}"
            count = cache.get(cache_key, 0)
            if count >= 3:
                return Response(
                    {"error": "Demasiadas solicitudes. Intenta en una hora."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            cache.set(cache_key, count + 1, timeout=3600)

        # Idempotency: ignore a second submit from the same user within 60s.
        if user is not None:
            recent = ContactRequest.objects.filter(
                user=user,
                created_at__gte=timezone.now() - timedelta(seconds=60),
            ).first()
            if recent:
                return Response(
                    ContactRequestSerializer(recent).data, status=status.HTTP_200_OK
                )

        # Validate ownership of project if sent (only for authenticated users)
        project_id = request.data.get("project")
        if project_id and user is not None:
            if not Project.objects.filter(id=project_id, user=user).exists():
                return Response(
                    {"error": "Proyecto no encontrado."},
                    status=status.HTTP_404_NOT_FOUND,
                )
        elif project_id and user is None:
            # Anonymous users cannot reference projects
            project_id = None

        serializer = ContactRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        contact = serializer.save(user=user)

        # Meta Ads: track lead from contact form
        try:
            from apps.marketing.meta_capi import track_from_request

            track_from_request(
                request,
                "Lead",
                email=contact.email,
                external_id=str(contact.id),
                custom_data={"source": "contact_form"},
            )
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "Meta CAPI tracking failed for contact %s", contact.id
            )

        try:
            from apps.users.services.email import email_service

            sent = email_service.send_contact_request(contact)
            if sent:
                contact.email_sent = True
                contact.save(update_fields=["email_sent"])
        except Exception:
            import logging

            logging.getLogger(__name__).exception(
                "Failed to send contact email for request %s", contact.id
            )

        return Response(
            ContactRequestSerializer(contact).data, status=status.HTTP_201_CREATED
        )


class ProjectExportLogView(APIView):
    """POST /api/projects/<pk>/export/ — log a ZIP export event."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
        except Project.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        file_count = request.data.get("file_count", 0)
        log = ProjectExportLog.objects.create(
            user=request.user,
            project=project,
            file_count=file_count,
        )
        return Response({"id": log.id, "exported_at": log.exported_at}, status=status.HTTP_201_CREATED)
