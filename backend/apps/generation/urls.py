from django.urls import path

from . import views

app_name = "generation"

urlpatterns = [
    path("generate/", views.generate_view, name="generate"),
    path("generate/status/<int:generation_id>/", views.generation_status_view, name="generation-status"),
    path("projects/<int:project_id>/active-generation/", views.active_generation_view, name="active-generation"),
    path("estimate/", views.estimate_view, name="estimate"),
    path("models/", views.models_view, name="models"),
]
