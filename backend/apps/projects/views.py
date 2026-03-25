from django.db.models import Count
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

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
        # Return full detail serializer for the created project
        project = serializer.instance
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
