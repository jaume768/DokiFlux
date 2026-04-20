from django.urls import path

from . import views

app_name = "billing"

urlpatterns = [
    path("balance/", views.BalanceView.as_view(), name="balance"),
    path("transactions/", views.TransactionListView.as_view(), name="transactions"),
    path("plans/", views.PlansView.as_view(), name="plans"),
    path("create-checkout-session/", views.CreateCheckoutSessionView.as_view(), name="create-checkout-session"),
    path("create-topup-session/", views.CreateTopupSessionView.as_view(), name="create-topup-session"),
    path("create-portal-session/", views.CreatePortalSessionView.as_view(), name="create-portal-session"),
    path("verify-session/", views.VerifyCheckoutSessionView.as_view(), name="verify-session"),
    path("webhook/", views.StripeWebhookView.as_view(), name="stripe-webhook"),
]
