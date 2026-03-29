from django.urls import path

from .views import (
    RegisterView,
    LoginView,
    LogoutView,
    CookieTokenRefreshView,
    VerifyEmailView,
    ResendVerificationView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    MeView,
    SetUsernameView,
    CheckUsernameView,
    GoogleAuthView,
    ProfileStatsView,
)

app_name = "users"

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("token/refresh/", CookieTokenRefreshView.as_view(), name="token-refresh"),
    path("verify-email/", VerifyEmailView.as_view(), name="verify-email"),
    path("resend-verification/", ResendVerificationView.as_view(), name="resend-verification"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password-reset"),
    path("password-reset-confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/", MeView.as_view(), name="me"),
    path("set-username/", SetUsernameView.as_view(), name="set-username"),
    path("check-username/<str:username>/", CheckUsernameView.as_view(), name="check-username"),
    path("google/", GoogleAuthView.as_view(), name="google-auth"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile-stats/", ProfileStatsView.as_view(), name="profile-stats"),
]
