from django.urls import path

from . import views

app_name = "projects"

urlpatterns = [
    path(
        "",
        views.ProjectListCreateView.as_view(),
        name="list-create",
    ),
    path(
        "<int:pk>/",
        views.ProjectDetailView.as_view(),
        name="detail",
    ),
    path(
        "<int:project_id>/messages/",
        views.ChatMessageListView.as_view(),
        name="messages",
    ),
    path(
        "<int:pk>/restore/<int:generation_id>/",
        views.ProjectRestoreView.as_view(),
        name="restore",
    ),
]
