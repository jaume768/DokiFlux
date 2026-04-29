import logging
from decimal import Decimal

import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

from .models import (
    BillingInvoice,
    BillingPayment,
    BillingSubscription,
    CreditTransaction,
    StripeEvent,
    UserPlan,
)
from .plans import PLAN_DEFINITIONS
from .serializers import (
    CreditTransactionSerializer,
    BillingInvoiceSerializer,
    BillingPaymentSerializer,
    BillingSubscriptionSerializer,
    PlanDefinitionSerializer,
)
from .services import add_topup_credits, downgrade_to_free, get_balance, renew_monthly_credits, set_subscription_cancellation, upgrade_to_premium

User = get_user_model()


def _stripe_ts(value):
    if not value:
        return None
    return timezone.datetime.fromtimestamp(value, tz=timezone.utc)


def _cents_to_decimal(value):
    return Decimal(str(value or 0)) / Decimal("100")


def _first_line_item_price_id(subscription):
    items = subscription.get("items", {}).get("data", [])
    if not items:
        return ""
    price = items[0].get("price") or {}
    return price.get("id", "")


def _invoice_period(invoice):
    lines = invoice.get("lines", {}).get("data", [])
    if not lines:
        return None, None
    period = lines[0].get("period") or {}
    return _stripe_ts(period.get("start")), _stripe_ts(period.get("end"))


class BalanceView(APIView):
    """GET /api/billing/balance/ → current balance + active plan."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        plan = getattr(request.user, "plan", None)

        # Live-sync Stripe subscription status for premium users so that
        # cancellations and expirations are reflected without waiting for webhooks.
        if plan and plan.plan_type == "premium" and plan.stripe_subscription_id and settings.STRIPE_SECRET_KEY:
            try:
                stripe.api_key = settings.STRIPE_SECRET_KEY
                sub = stripe.Subscription.retrieve(plan.stripe_subscription_id)
                sub_status = sub.get("status", "")
                cape = sub.get("cancel_at_period_end", False)
                cancel_at_ts = sub.get("cancel_at")
                if sub_status in ("canceled", "unpaid", "past_due"):
                    downgrade_to_free(request.user)
                    plan.refresh_from_db()
                elif sub_status == "active":
                    from django.utils.timezone import datetime as tz_datetime, timezone as tz
                    cancel_at_dt = tz_datetime.fromtimestamp(cancel_at_ts, tz=tz.utc) if cancel_at_ts else None
                    set_subscription_cancellation(request.user, cancel_at_period_end=cape, cancel_at=cancel_at_dt)
                    plan.refresh_from_db()
            except Exception:
                pass  # Stripe unavailable — use cached DB values

        balance = get_balance(request.user)
        return Response(
            {
                "balance": str(balance),
                "plan": {
                    "plan_type": plan.plan_type if plan else "free",
                    "started_at": plan.started_at.isoformat() if plan else None,
                    "stripe_subscription_id": plan.stripe_subscription_id if plan else "",
                    "cancel_at_period_end": plan.cancel_at_period_end if plan else False,
                    "cancel_at": plan.cancel_at.isoformat() if (plan and plan.cancel_at) else None,
                },
            }
        )


class TransactionListView(generics.ListAPIView):
    """GET /api/billing/transactions/ → paginated transaction history."""

    serializer_class = CreditTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CreditTransaction.objects.filter(user=self.request.user)


class BillingPaymentListView(generics.ListAPIView):
    serializer_class = BillingPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BillingPayment.objects.filter(user=self.request.user)


class BillingInvoiceListView(generics.ListAPIView):
    serializer_class = BillingInvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BillingInvoice.objects.filter(user=self.request.user)


class BillingSubscriptionListView(generics.ListAPIView):
    serializer_class = BillingSubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BillingSubscription.objects.filter(user=self.request.user)


class BillingHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = BillingPayment.objects.filter(user=request.user)[:20]
        invoices = BillingInvoice.objects.filter(user=request.user)[:20]
        subscription = BillingSubscription.objects.filter(user=request.user).first()
        return Response(
            {
                "payments": BillingPaymentSerializer(payments, many=True).data,
                "invoices": BillingInvoiceSerializer(invoices, many=True).data,
                "subscription": BillingSubscriptionSerializer(subscription).data if subscription else None,
            }
        )


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


class CreateTopupSessionView(APIView):
    """
    POST /api/billing/create-topup-session/
    Body: { amount_eur: number } (min 5)
    Creates a Stripe Checkout session with a dynamic price to buy credits.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not settings.STRIPE_SECRET_KEY:
            return Response(
                {"error": "Stripe not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        min_eur = int(getattr(settings, "STRIPE_TOPUP_MIN_EUR", 5) or 5)
        try:
            amount_eur = int(float(request.data.get("amount_eur", 0)))
        except (TypeError, ValueError):
            return Response({"error": "amount_eur must be a number."}, status=status.HTTP_400_BAD_REQUEST)
        if amount_eur < min_eur:
            return Response(
                {"error": f"El importe mínimo es {min_eur} €."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if amount_eur > 500:
            return Response(
                {"error": "El importe máximo es 500 €."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stripe.api_key = settings.STRIPE_SECRET_KEY
        user = request.user
        plan = getattr(user, "plan", None)
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
                        "price_data": {
                            "currency": "eur",
                            "unit_amount": amount_eur * 100,
                            "product_data": {
                                "name": "Créditos DokiFlux",
                                "description": f"Recarga de {amount_eur} € en saldo para generaciones con IA.",
                            },
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                invoice_creation={"enabled": True},
                success_url=f"{frontend_url}/app/billing?topup=success&session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{frontend_url}/app/billing?topup=cancelled",
                metadata={
                    "user_id": str(user.id),
                    "kind": "topup",
                    "amount_eur": str(amount_eur),
                },
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

        logger.info("[verify-session] user=%s session_id=%s", request.user.email, session_id)
        stripe.api_key = settings.STRIPE_SECRET_KEY

        try:
            session = stripe.checkout.Session.retrieve(session_id)
        except stripe.StripeError as e:
            logger.error("[verify-session] Stripe error retrieving session: %s", e)
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        session_status = session.status
        payment_status = session.payment_status
        logger.info("[verify-session] session status=%s payment_status=%s", session_status, payment_status)

        if session_status != "complete" or payment_status != "paid":
            logger.warning("[verify-session] Payment not completed — status=%s payment_status=%s", session_status, payment_status)
            return Response({"upgraded": False, "reason": "payment not completed"})

        customer_id = session.customer or ""
        subscription_id = session.subscription or ""

        plan = getattr(request.user, "plan", None)
        if plan and plan.plan_type == "premium":
            logger.info("[verify-session] User %s already premium, skipping", request.user.email)
            return Response({"upgraded": False, "reason": "already premium", "plan_type": "premium"})

        logger.info("[verify-session] Upgrading user %s to premium (customer=%s, sub=%s)", request.user.email, customer_id, subscription_id)
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
            logger.warning("[webhook] STRIPE_WEBHOOK_SECRET not configured — rejecting request")
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
            logger.error("[webhook] Invalid payload")
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)
        except stripe.SignatureVerificationError:
            logger.error("[webhook] Invalid signature — check STRIPE_WEBHOOK_SECRET matches 'stripe listen' output")
            return Response({"error": "Invalid signature"}, status=status.HTTP_400_BAD_REQUEST)

        event_type = event["type"]
        data = event["data"]["object"]
        logger.info("[webhook] Received event type=%s id=%s", event_type, event.id)

        try:
            StripeEvent.objects.create(event_id=event.id, event_type=event_type)
        except IntegrityError:
            logger.info("[webhook] Event %s already processed", event.id)
            return Response({"status": "duplicate"})

        if event_type == "checkout.session.completed":
            self._handle_checkout_completed(data)

        elif event_type in ("invoice.payment_succeeded", "invoice.payment_failed"):
            self._handle_invoice_event(data)

        elif event_type in ("customer.subscription.created", "customer.subscription.deleted", "customer.subscription.updated"):
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

    def _persist_checkout_payment(self, user, session, kind):
        amount_total = _cents_to_decimal(session.get("amount_total"))
        amount_paid = amount_total if session.get("payment_status") == "paid" else Decimal("0")
        lookup = {"stripe_checkout_session_id": session.id}
        BillingPayment.objects.update_or_create(
            **lookup,
            defaults={
                "user": user,
                "kind": kind,
                "status": session.get("payment_status") or session.get("status") or "",
                "stripe_payment_intent_id": session.get("payment_intent") or "",
                "stripe_invoice_id": session.get("invoice") or "",
                "stripe_customer_id": session.get("customer") or "",
                "description": "Recarga de saldo" if kind == "topup" else "Suscripción Premium",
                "currency": (session.get("currency") or "eur").lower(),
                "amount_total": amount_total,
                "amount_paid": amount_paid,
                "paid_at": timezone.now() if session.get("payment_status") == "paid" else None,
            },
        )

    def _persist_subscription(self, user, subscription):
        BillingSubscription.objects.update_or_create(
            stripe_subscription_id=subscription.id,
            defaults={
                "user": user,
                "stripe_customer_id": subscription.get("customer") or "",
                "stripe_price_id": _first_line_item_price_id(subscription),
                "status": subscription.get("status") or "",
                "plan_type": "premium",
                "current_period_start": _stripe_ts(subscription.get("current_period_start")),
                "current_period_end": _stripe_ts(subscription.get("current_period_end")),
                "cancel_at_period_end": subscription.get("cancel_at_period_end") or False,
                "cancel_at": _stripe_ts(subscription.get("cancel_at")),
            },
        )

    def _persist_invoice(self, user, invoice):
        period_start, period_end = _invoice_period(invoice)
        BillingInvoice.objects.update_or_create(
            stripe_invoice_id=invoice.id,
            defaults={
                "user": user,
                "stripe_subscription_id": invoice.get("subscription") or "",
                "stripe_customer_id": invoice.get("customer") or "",
                "number": invoice.get("number") or "",
                "status": invoice.get("status") or "",
                "billing_reason": invoice.get("billing_reason") or "",
                "hosted_invoice_url": invoice.get("hosted_invoice_url") or "",
                "invoice_pdf": invoice.get("invoice_pdf") or "",
                "currency": (invoice.get("currency") or "eur").lower(),
                "subtotal": _cents_to_decimal(invoice.get("subtotal")),
                "tax": _cents_to_decimal(invoice.get("tax")),
                "total": _cents_to_decimal(invoice.get("total")),
                "amount_paid": _cents_to_decimal(invoice.get("amount_paid")),
                "period_start": period_start,
                "period_end": period_end,
                "paid_at": _stripe_ts(invoice.get("status_transitions", {}).get("paid_at")),
            },
        )
        BillingPayment.objects.update_or_create(
            stripe_invoice_id=invoice.id,
            defaults={
                "user": user,
                "kind": "subscription" if invoice.get("subscription") else "topup",
                "status": invoice.get("status") or "",
                "stripe_checkout_session_id": "",
                "stripe_payment_intent_id": invoice.get("payment_intent") or "",
                "stripe_customer_id": invoice.get("customer") or "",
                "description": "Factura de suscripción" if invoice.get("subscription") else "Factura de recarga",
                "currency": (invoice.get("currency") or "eur").lower(),
                "amount_total": _cents_to_decimal(invoice.get("total")),
                "amount_paid": _cents_to_decimal(invoice.get("amount_paid")),
                "paid_at": _stripe_ts(invoice.get("status_transitions", {}).get("paid_at")),
            },
        )

    def _handle_checkout_completed(self, session):
        metadata = session.metadata or {}
        user = self._get_user_from_metadata(metadata)
        if not user:
            customer_id = session.customer or ""
            user = self._get_user_from_customer(customer_id)
        if not user:
            logger.error("[webhook] checkout.session.completed — could not find user. metadata=%s customer=%s", metadata, session.customer)
            return

        # Top-up (one-off payment) branch
        if metadata.get("kind") == "topup":
            self._persist_checkout_payment(user, session, "topup")
            try:
                amount_eur = int(metadata.get("amount_eur") or 0)
            except (TypeError, ValueError):
                amount_eur = 0
            if amount_eur <= 0 and session.amount_total:
                amount_eur = int(session.amount_total) // 100
            logger.info("[webhook] checkout.session.completed (topup) — user=%s amount_eur=%s session=%s",
                        user.email, amount_eur, session.id)
            add_topup_credits(user, amount_eur, stripe_session_id=session.id)
            return

        customer_id = session.customer or ""
        subscription_id = session.subscription or ""
        self._persist_checkout_payment(user, session, "subscription")
        logger.info("[webhook] checkout.session.completed — upgrading user=%s customer=%s sub=%s", user.email, customer_id, subscription_id)
        upgrade_to_premium(user, customer_id, subscription_id)
        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                self._persist_subscription(user, subscription)
            except stripe.StripeError:
                logger.exception("[webhook] Could not retrieve subscription %s", subscription_id)

    def _handle_invoice_event(self, invoice):
        customer_id = invoice.customer or ""
        user = self._get_user_from_customer(customer_id)
        if user:
            self._persist_invoice(user, invoice)
        if invoice.status != "paid":
            return
        billing_reason = invoice.billing_reason or ""
        if billing_reason == "subscription_cycle":
            if user:
                renew_monthly_credits(user)

    def _handle_subscription_change(self, subscription):
        sub_status = subscription.status or ""
        customer_id = subscription.customer or ""
        cancel_at_period_end = subscription.cancel_at_period_end or False
        cancel_at_ts = subscription.cancel_at  # Unix timestamp or None
        user = self._get_user_from_customer(customer_id)
        if not user:
            return
        self._persist_subscription(user, subscription)

        if sub_status in ("canceled", "unpaid", "past_due"):
            downgrade_to_free(user)
        elif sub_status == "active" and cancel_at_period_end:
            from django.utils.timezone import datetime, timezone as tz
            cancel_at_dt = datetime.fromtimestamp(cancel_at_ts, tz=tz.utc) if cancel_at_ts else None
            set_subscription_cancellation(user, cancel_at_period_end=True, cancel_at=cancel_at_dt)
        elif sub_status == "active" and not cancel_at_period_end:
            set_subscription_cancellation(user, cancel_at_period_end=False, cancel_at=None)
