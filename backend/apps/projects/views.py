from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.generation.models import Generation
from .models import ChatMessage, Project
from .permissions import IsProjectOwner
from .serializers import (
    ChatMessageSerializer,
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
