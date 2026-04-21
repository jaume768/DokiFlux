from django.urls import path

from . import views

app_name = "demo"

urlpatterns = [
    path("start/", views.DemoStartView.as_view(), name="start"),
    path("session/", views.DemoSessionView.as_view(), name="session"),
    path("generate/", views.demo_generate_view, name="generate"),
    path("migrate/", views.DemoMigrateView.as_view(), name="migrate"),
    path("reset/", views.DemoResetView.as_view(), name="reset"),
]
