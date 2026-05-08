"""
URL configuration for Dokiflux backend.
"""
from django.contrib import admin
from django.conf import settings
from django.http import JsonResponse
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.projects.views import ContactRequestView


def public_config_view(_request):
    return JsonResponse({
        "features": {
            "project_assets_enabled": bool(settings.AWS_STORAGE_BUCKET_NAME),
        }
    })


urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/config/", public_config_view, name="public-config"),
    path("api/auth/", include("apps.users.urls")),
    path("api/projects/", include("apps.projects.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/contact/", ContactRequestView.as_view(), name="contact"),
    path("api/demo/", include("apps.demo.urls")),
    path("api/", include("apps.generation.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
