from decimal import Decimal
from datetime import timedelta

from django.db import transaction
from django.db.models import Sum
from django.utils.timezone import now

from .models import CreditGrant, CreditTransaction, UserPlan
from .plans import (
    MONTHLY_GRANT_EXPIRY_DAYS,
    PLAN_DEFINITIONS,
)


def get_balance(user):
    """Total active credit balance (non-expired grants)."""
    result = (
        CreditGrant.objects.filter(
            user=user, remaining__gt=0, expires_at__gt=now()
        ).aggregate(total=Sum("remaining"))
    )
    return result["total"] or Decimal("0")


def consume_credits(user, amount, description="", generation_id=None):
    """
    Deduct credits using FIFO (oldest-expiring grant first).
    Uses select_for_update for atomicity.
    Returns True if sufficient balance, False otherwise.
    """
    amount = Decimal(str(amount))

    with transaction.atomic():
        grants = (
            CreditGrant.objects.filter(
                user=user, remaining__gt=0, expires_at__gt=now()
            )
            .select_for_update()
            .order_by("expires_at")
        )

        total_available = sum(g.remaining for g in grants)
        if total_available < amount:
            return False

        remaining_to_deduct = amount
        for grant in grants:
            if remaining_to_deduct <= 0:
                break
            deduction = min(grant.remaining, remaining_to_deduct)
            grant.remaining -= deduction
            grant.save(update_fields=["remaining"])
            remaining_to_deduct -= deduction

            CreditTransaction.objects.create(
                user=user,
                amount=-deduction,
                tx_type="generation",
                description=description,
                generation_id=generation_id,
                grant=grant,
            )

    return True


def grant_monthly_credits(user):
    """
    Grant monthly credits based on the user's plan.
    Creates a CreditGrant and logs a CreditTransaction.
    """
    try:
        plan = UserPlan.objects.get(user=user)
    except UserPlan.DoesNotExist:
        plan = UserPlan.objects.create(user=user, plan_type="free")

    plan_def = PLAN_DEFINITIONS.get(plan.plan_type, PLAN_DEFINITIONS["free"])
    credit_amount = plan_def["monthly_credits"]

    grant = CreditGrant.objects.create(
        user=user,
        original_amount=credit_amount,
        remaining=credit_amount,
        source="monthly",
        expires_at=now() + timedelta(days=MONTHLY_GRANT_EXPIRY_DAYS),
    )

    CreditTransaction.objects.create(
        user=user,
        amount=credit_amount,
        tx_type="monthly_grant",
        description=f"Monthly {plan.plan_type} plan credits",
        grant=grant,
    )

    return grant


def upgrade_to_premium(user, stripe_customer_id: str, stripe_subscription_id: str):
    """
    Upgrade a user to the premium plan.
    Updates UserPlan, saves Stripe IDs, and grants premium monthly credits.
    """
    plan, _ = UserPlan.objects.get_or_create(user=user, defaults={"plan_type": "free"})
    was_free = plan.plan_type != "premium"
    plan.plan_type = "premium"
    plan.stripe_customer_id = stripe_customer_id
    plan.stripe_subscription_id = stripe_subscription_id
    plan.save(update_fields=["plan_type", "stripe_customer_id", "stripe_subscription_id"])

    if was_free:
        grant_monthly_credits(user)

    return plan


def downgrade_to_free(user):
    """
    Downgrade a user to the free plan (subscription cancelled/expired).
    """
    plan = getattr(user, "plan", None)
    if plan:
        plan.plan_type = "free"
        plan.stripe_subscription_id = ""
        plan.save(update_fields=["plan_type", "stripe_subscription_id"])
    return plan


def renew_monthly_credits(user):
    """
    Called on each successful Stripe invoice payment to grant monthly credits.
    """
    return grant_monthly_credits(user)
