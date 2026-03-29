import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditTransaction, UserPlan
from .plans import PLAN_DEFINITIONS
from .serializers import (
    CreditTransactionSerializer,
    PlanDefinitionSerializer,
)
from .services import downgrade_to_free, get_balance, renew_monthly_credits, upgrade_to_premium

User = get_user_model()


class BalanceView(APIView):
    """GET /api/billing/balance/ → current balance + active plan."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        balance = get_balance(request.user)
        plan = getattr(request.user, "plan", None)
        return Response(
            {
                "balance": str(balance),
                "plan": {
                    "plan_type": plan.plan_type if plan else "free",
                    "started_at": (
                        plan.started_at.isoformat() if plan else None
                    ),
                    "stripe_subscription_id": (
                        plan.stripe_subscription_id if plan else ""
                    ),
                },
            }
        )


class TransactionListView(generics.ListAPIView):
    """GET /api/billing/transactions/ → paginated transaction history."""

    serializer_class = CreditTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CreditTransaction.objects.filter(user=self.request.user)


class PlansView(APIView):
    """GET /api/billing/plans/ → available plans (public)."""

    permission_classes = [AllowAny]

    def get(self, request):
        plans = []
        for name, definition in PLAN_DEFINITIONS.items():
            plans.append(
                {
                    "name": name,
                    **{k: str(v) for k, v in definition.items()},
                }
            )
        return Response(plans)


class CreateCheckoutSessionView(APIView):
    """
    POST /api/billing/create-checkout-session/
    Creates a Stripe Checkout session for upgrading to Premium.
    Returns { checkout_url } to redirect the user to Stripe.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"error": "Stripe not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        user = request.user
        plan = getattr(user, "plan", None)

        if plan and plan.plan_type == "premium":
            return Response(
                {"error": "Already on Premium plan."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        frontend_url = settings.FRONTEND_URL

        try:
            customer_id = plan.stripe_customer_id if plan else ""

            if not customer_id:
                customer = stripe.Customer.create(
                    email=user.email,
                    metadata={"user_id": str(user.id)},
                )
                customer_id = customer.id
                if plan:
                    plan.stripe_customer_id = customer_id
                    plan.save(update_fields=["stripe_customer_id"])

            session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=["card"],
                line_items=[
                    {
                        "price": settings.STRIPE_PREMIUM_PRICE_ID,
                        "quantity": 1,
                    }
                ],
                mode="subscription",
                success_url=f"{frontend_url}/app/billing/success?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{frontend_url}/app/billing/cancel",
                metadata={"user_id": str(user.id)},
                subscription_data={"metadata": {"user_id": str(user.id)}},
                allow_promotion_codes=True,
            )
            return Response({"checkout_url": session.url})
        except stripe.StripeError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class CreatePortalSessionView(APIView):
    """
    POST /api/billing/create-portal-session/
    Creates a Stripe Customer Portal session for managing the subscription.
    Returns { portal_url }.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"error": "Stripe not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        plan = getattr(request.user, "plan", None)

        if not plan or not plan.stripe_customer_id:
            return Response(
                {"error": "No Stripe customer found for this account."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            session = stripe.billing_portal.Session.create(
                customer=plan.stripe_customer_id,
                return_url=f"{settings.FRONTEND_URL}/app/billing",
            )
            return Response({"portal_url": session.url})
        except stripe.StripeError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )


class VerifyCheckoutSessionView(APIView):
    """
    POST /api/billing/verify-session/
    Called by the success page with { session_id }.
    Fetches the session from Stripe, and if complete + payment paid, upgrades the user.
    Idempotent — safe to call multiple times.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"error": "Stripe not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        session_id = request.data.get("session_id", "")
        if not session_id:
            return Response({"error": "session_id required."}, status=status.HTTP_400_BAD_REQUEST)

        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.StripeError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        if session.get("status") != "complete" or session.get("payment_status") != "paid":
            return Response({"upgraded": False, "reason": "payment not completed"})

        customer_id = session.get("customer", "")
        subscription_id = session.get("subscription", "")

        plan = getattr(request.user, "plan", None)
        if plan and plan.plan_type == "premium":
            return Response({"upgraded": False, "reason": "already premium", "plan_type": "premium"})

        upgrade_to_premium(request.user, customer_id, subscription_id)
        return Response({"upgraded": True, "plan_type": "premium"})


class StripeWebhookView(APIView):
    """
    POST /api/billing/webhook/
    Receives and verifies Stripe webhook events.
    No authentication — verified via Stripe-Signature header.
    """

    authentication_classes = []
    permission_classes = []

    def post(self, request):
        if not settings.STRIPE_WEBHOOK_SECRET:
            return Response(
                {"error": "Webhook secret not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        payload = request.body
        sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.error.SignatureVerificationError:
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        data = event["data"]["object"]

        if event_type == "checkout.session.completed":
            self._handle_checkout_completed(data)

        elif event_type == "invoice.payment_succeeded":
            self._handle_invoice_paid(data)

        elif event_type in ("customer.subscription.deleted", "customer.subscription.updated"):
            self._handle_subscription_change(data)

        return Response({"status": "ok"})

    def _get_user_from_metadata(self, metadata):
        user_id = metadata.get("user_id")
        if not user_id:
            return None
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    def _get_user_from_customer(self, customer_id):
        try:
            plan = UserPlan.objects.select_related("user").get(stripe_customer_id=customer_id)
            return plan.user
        except UserPlan.DoesNotExist:
            return None

    def _handle_checkout_completed(self, session):
        user = self._get_user_from_metadata(session.get("metadata", {}))
        if not user:
            customer_id = session.get("customer", "")
            user = self._get_user_from_customer(customer_id)
        if not user:
            return

        customer_id = session.get("customer", "")
        subscription_id = session.get("subscription", "")
        upgrade_to_premium(user, customer_id, subscription_id)

    def _handle_invoice_paid(self, invoice):
        billing_reason = invoice.get("billing_reason", "")
        if billing_reason == "subscription_cycle":
            customer_id = invoice.get("customer", "")
            user = self._get_user_from_customer(customer_id)
            if user:
                renew_monthly_credits(user)

    def _handle_subscription_change(self, subscription):
        sub_status = subscription.get("status", "")
        customer_id = subscription.get("customer", "")
        user = self._get_user_from_customer(customer_id)
        if not user:
            return

        if sub_status in ("canceled", "unpaid", "past_due"):
            downgrade_to_free(user)
