"""
Lightweight JWT authentication for raw async Django views.
DRF's authentication doesn't run on raw async views, so we
extract and verify the JWT token manually in middleware.

For sync/DRF views the middleware passes through unchanged — DRF
handles authentication via CookieJWTAuthentication.
"""
from asgiref.sync import iscoroutinefunction, markcoroutinefunction, sync_to_async
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


class AsyncJWTAuthMiddleware:
    """
    Dual sync/async middleware:
    - Async views (generate_view): authenticates via JWT cookie or Bearer header.
    - Sync/DRF views: passes through immediately; DRF uses CookieJWTAuthentication.
    """

    async_capable = True
    sync_capable = True

    def __init__(self, get_response):
        self.get_response = get_response
        if iscoroutinefunction(self.get_response):
            markcoroutinefunction(self)

    def __call__(self, request):
        if iscoroutinefunction(self):
            return self.__acall__(request)
        return self.get_response(request)

    async def __acall__(self, request):
        current_user = await request.auser()
        if current_user.is_anonymous:
            user = await self._authenticate(request)
            if user:
                request.user = user
        return await self.get_response(request)

    async def _authenticate(self, request):
        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if auth_header.startswith("Bearer "):
            token_str = auth_header[7:]
        else:
            token_str = request.COOKIES.get("access_token", "")

        if not token_str:
            return None
        try:
            token = AccessToken(token_str)
            user_id = token.get("user_id")
            if user_id is None:
                return None
            return await sync_to_async(User.objects.get)(id=user_id)
        except (TokenError, User.DoesNotExist):
            return None
