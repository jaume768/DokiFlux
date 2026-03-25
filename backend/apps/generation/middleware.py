"""
Lightweight JWT authentication for async Django views.
DRF's authentication doesn't run on raw async views, so we
extract and verify the JWT token manually in middleware.
"""
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class AsyncJWTAuthMiddleware:
    """
    Middleware that authenticates requests using JWT Bearer tokens.
    Works with both sync and async views.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only process if no user is set yet or user is anonymous
        if not hasattr(request, "user") or request.user.is_anonymous:
            user = self._authenticate(request)
            if user:
                request.user = user

        return self.get_response(request)

    def _authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header.startswith("Bearer "):
            return None

        token_str = auth_header[7:]
        try:
            token = AccessToken(token_str)
            user_id = token.get("user_id")
            if user_id is None:
                return None
            return User.objects.get(id=user_id)
        except (TokenError, User.DoesNotExist):
            return None
