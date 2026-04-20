"""
URL configuration for Dokiflux backend.
"""
from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.projects.views import ContactRequestView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.users.urls")),
    path("api/projects/", include("apps.projects.urls")),
    path("api/billing/", include("apps.billing.urls")),
    path("api/contact/", ContactRequestView.as_view(), name="contact"),
    path("api/", include("apps.generation.urls")),
    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]
