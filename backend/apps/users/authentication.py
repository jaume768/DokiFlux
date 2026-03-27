from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT's authentication to also accept the access token
    from the `access_token` httpOnly cookie, falling back to the standard
    Authorization: Bearer header.
    """

    def authenticate(self, request):
        # Try standard Authorization header first
        result = super().authenticate(request)
        if result is not None:
            return result

        # Fallback: read from httpOnly cookie
        raw_token = request.COOKIES.get("access_token")
        if not raw_token:
            return None

        try:
            validated_token = self.get_validated_token(raw_token.encode())
            return self.get_user(validated_token), validated_token
        except Exception:
            return None
