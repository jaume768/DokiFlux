from decimal import Decimal

from django.conf import settings
from django.db import models


class UserPlan(models.Model):
    """Active plan for a user. Auto-created on registration via signal."""

    PLAN_CHOICES = [
        ("free", "Free"),
        ("premium", "Premium"),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="plan",
    )
    plan_type = models.CharField(
        max_length=20, choices=PLAN_CHOICES, default="free"
    )
    started_at = models.DateTimeField(auto_now_add=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True, default="")
    stripe_subscription_id = models.CharField(max_length=100, blank=True, default="")
    cancel_at_period_end = models.BooleanField(default=False)
    cancel_at = models.DateTimeField(null=True, blank=True)
    debt = models.DecimalField(
        max_digits=10, decimal_places=6, default=Decimal("0")
    )

    class Meta:
        db_table = "user_plans"

    def __str__(self):
        return f"{self.user.email} — {self.plan_type}"


class CreditGrant(models.Model):
    """Batch of credits with expiration date (FIFO consumption)."""

    SOURCE_CHOICES = [
        ("monthly", "Monthly"),
        ("purchase", "Purchase"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_grants",
    )
    original_amount = models.DecimalField(max_digits=10, decimal_places=6)
    remaining = models.DecimalField(max_digits=10, decimal_places=6)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    granted_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "credit_grants"
        ordering = ["expires_at"]

    def __str__(self):
        return (
            f"{self.user.email} — {self.source} "
            f"${self.remaining}/{self.original_amount}"
        )


class CreditTransaction(models.Model):
    """Immutable log of every credit movement."""

    TX_TYPE_CHOICES = [
        ("monthly_grant", "Monthly Grant"),
        ("purchase", "Purchase"),
        ("generation", "Generation"),
        ("refund", "Refund"),
        ("expiry", "Expiry"),
        ("debt", "Debt"),
        ("debt_repaid", "Debt Repaid"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="credit_transactions",
    )
    amount = models.DecimalField(max_digits=10, decimal_places=6)
    tx_type = models.CharField(max_length=20, choices=TX_TYPE_CHOICES)
    description = models.TextField(blank=True)
    generation_id = models.IntegerField(null=True, blank=True)
    grant = models.ForeignKey(
        CreditGrant,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="transactions",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "credit_transactions"
        ordering = ["-created_at"]

    def __str__(self):
        sign = "+" if self.amount > 0 else ""
        return f"{self.user.email} {sign}{self.amount} ({self.tx_type})"


class StripeEvent(models.Model):
    event_id = models.CharField(max_length=120, unique=True)
    event_type = models.CharField(max_length=120)
    processed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "stripe_events"
        ordering = ["-processed_at"]

    def __str__(self):
        return f"{self.event_type} ({self.event_id})"


class BillingSubscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="billing_subscriptions",
    )
    stripe_subscription_id = models.CharField(max_length=120, unique=True)
    stripe_customer_id = models.CharField(max_length=120, blank=True, default="")
    stripe_price_id = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=40, blank=True, default="")
    plan_type = models.CharField(max_length=20, default="premium")
    current_period_start = models.DateTimeField(null=True, blank=True)
    current_period_end = models.DateTimeField(null=True, blank=True)
    cancel_at_period_end = models.BooleanField(default=False)
    cancel_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_subscriptions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} — {self.status}"


class BillingInvoice(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="billing_invoices",
    )
    stripe_invoice_id = models.CharField(max_length=120, unique=True)
    stripe_subscription_id = models.CharField(max_length=120, blank=True, default="")
    stripe_customer_id = models.CharField(max_length=120, blank=True, default="")
    number = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=40, blank=True, default="")
    billing_reason = models.CharField(max_length=80, blank=True, default="")
    hosted_invoice_url = models.URLField(max_length=600, blank=True, default="")
    invoice_pdf = models.URLField(max_length=600, blank=True, default="")
    currency = models.CharField(max_length=10, default="eur")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_invoices"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} — {self.number or self.stripe_invoice_id}"


class BillingPayment(models.Model):
    KIND_CHOICES = [
        ("subscription", "Subscription"),
        ("topup", "Top-up"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="billing_payments",
    )
    kind = models.CharField(max_length=30, choices=KIND_CHOICES, default="other")
    status = models.CharField(max_length=40, blank=True, default="")
    stripe_checkout_session_id = models.CharField(max_length=120, blank=True, default="")
    stripe_payment_intent_id = models.CharField(max_length=120, blank=True, default="")
    stripe_invoice_id = models.CharField(max_length=120, blank=True, default="")
    stripe_customer_id = models.CharField(max_length=120, blank=True, default="")
    description = models.CharField(max_length=255, blank=True, default="")
    currency = models.CharField(max_length=10, default="eur")
    amount_total = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal("0"))
    paid_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "billing_payments"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "-created_at"]),
            models.Index(fields=["stripe_checkout_session_id"]),
            models.Index(fields=["stripe_payment_intent_id"]),
            models.Index(fields=["stripe_invoice_id"]),
        ]

    def __str__(self):
        return f"{self.user.email} — {self.kind} — {self.amount_paid} {self.currency}"
