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
