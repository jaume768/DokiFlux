from django.urls import path

from . import views

app_name = "generation"

urlpatterns = [
    path("generate/", views.generate_view, name="generate"),
    path("estimate/", views.estimate_view, name="estimate"),
    path("models/", views.models_view, name="models"),
]
