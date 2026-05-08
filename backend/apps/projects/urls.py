from django.urls import path

from . import views
from .views import ProjectExportLogView

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
        "<int:project_id>/assets/",
        views.ProjectAssetListCreateView.as_view(),
        name="assets",
    ),
    path(
        "<int:project_id>/assets/<int:pk>/",
        views.ProjectAssetDetailView.as_view(),
        name="asset-detail",
    ),
    path(
        "<int:pk>/restore/<int:generation_id>/",
        views.ProjectRestoreView.as_view(),
        name="restore",
    ),
    path(
        "<int:pk>/export/",
        ProjectExportLogView.as_view(),
        name="export-log",
    ),
]
