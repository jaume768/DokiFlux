import logging
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

logger = logging.getLogger(__name__)


def _get_debt(user) -> Decimal:
    plan = getattr(user, "plan", None)
    if plan is None:
        try:
            plan = UserPlan.objects.get(user=user)
        except UserPlan.DoesNotExist:
            return Decimal("0")
    return plan.debt or Decimal("0")


def get_balance(user):
    """
    Net credit balance: active (non-expired) grants minus outstanding debt.
    May return a negative Decimal if the user owes credits.
    """
    result = (
        CreditGrant.objects.filter(
            user=user, remaining__gt=0, expires_at__gt=now()
        ).aggregate(total=Sum("remaining"))
    )
    gross = result["total"] or Decimal("0")
    return gross - _get_debt(user)


def consume_credits(user, amount, description="", generation_id=None):
    """
    Deduct credits using FIFO (oldest-expiring grant first).
    If available balance is insufficient, the remainder is added to the
    user's plan.debt so the balance goes negative. Always returns True.
    """
    amount = Decimal(str(amount))
    if amount <= 0:
        return True

    with transaction.atomic():
        grants = list(
            CreditGrant.objects.filter(
                user=user, remaining__gt=0, expires_at__gt=now()
            )
            .select_for_update()
            .order_by("expires_at")
        )

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

        # Overdraft: anything left over becomes debt on the user's plan.
        if remaining_to_deduct > 0:
            plan = (
                UserPlan.objects.select_for_update()
                .filter(user=user)
                .first()
            )
            if plan is None:
                plan = UserPlan.objects.create(user=user, plan_type="free")
                plan = (
                    UserPlan.objects.select_for_update()
                    .filter(pk=plan.pk)
                    .first()
                )
            plan.debt = (plan.debt or Decimal("0")) + remaining_to_deduct
            plan.save(update_fields=["debt"])

            CreditTransaction.objects.create(
                user=user,
                amount=-remaining_to_deduct,
                tx_type="debt",
                description=(description or "") + " [overdraft]",
                generation_id=generation_id,
                grant=None,
            )

    return True


def apply_to_debt(user, amount):
    """
    Apply an incoming credit amount to the user's outstanding debt first.
    Returns the remaining amount (Decimal) that should still be granted.
    Must be called inside or outside a transaction safely.
    """
    amount = Decimal(str(amount))
    if amount <= 0:
        return amount

    with transaction.atomic():
        plan = (
            UserPlan.objects.select_for_update()
            .filter(user=user)
            .first()
        )
        if plan is None or not plan.debt or plan.debt <= 0:
            return amount

        applied = min(plan.debt, amount)
        plan.debt -= applied
        plan.save(update_fields=["debt"])

        CreditTransaction.objects.create(
            user=user,
            amount=applied,
            tx_type="debt_repaid",
            description=f"Applied {applied} to outstanding debt",
            grant=None,
        )
        return amount - applied


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
    credit_amount = Decimal(str(plan_def["monthly_credits"]))
    logger.info("[credits] Granting %s credits to user=%s (plan=%s)", credit_amount, user.email, plan.plan_type)

    # Repay any outstanding debt first.
    remaining_amount = apply_to_debt(user, credit_amount)
    if remaining_amount <= 0:
        CreditTransaction.objects.create(
            user=user,
            amount=credit_amount,
            tx_type="monthly_grant",
            description=f"Monthly {plan.plan_type} plan credits (applied entirely to debt)",
            grant=None,
        )
        return None

    grant = CreditGrant.objects.create(
        user=user,
        original_amount=remaining_amount,
        remaining=remaining_amount,
        source="monthly",
        expires_at=now() + timedelta(days=MONTHLY_GRANT_EXPIRY_DAYS),
    )

    CreditTransaction.objects.create(
        user=user,
        amount=remaining_amount,
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
    logger.info("[upgrade] user=%s was_free=%s customer=%s sub=%s", user.email, was_free, stripe_customer_id, stripe_subscription_id)
    plan.plan_type = "premium"
    plan.stripe_customer_id = stripe_customer_id
    plan.stripe_subscription_id = stripe_subscription_id
    plan.cancel_at_period_end = False
    plan.cancel_at = None
    plan.save(update_fields=["plan_type", "stripe_customer_id", "stripe_subscription_id", "cancel_at_period_end", "cancel_at"])
    logger.info("[upgrade] UserPlan saved as premium for user=%s", user.email)

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
        plan.cancel_at_period_end = False
        plan.cancel_at = None
        plan.save(update_fields=["plan_type", "stripe_subscription_id", "cancel_at_period_end", "cancel_at"])
    return plan


def set_subscription_cancellation(user, cancel_at_period_end: bool, cancel_at=None):
    """
    Mark a premium subscription as pending cancellation (cancel_at_period_end=True)
    without immediately downgrading the plan.
    If cancel_at_period_end is False (user reactivated), clears the cancellation flags.
    """
    from django.utils.timezone import datetime as tz_datetime
    plan = getattr(user, "plan", None)
    if not plan:
        return
    plan.cancel_at_period_end = cancel_at_period_end
    plan.cancel_at = cancel_at
    plan.save(update_fields=["cancel_at_period_end", "cancel_at"])


def renew_monthly_credits(user):
    """
    Called on each successful Stripe invoice payment to grant monthly credits.
    """
    return grant_monthly_credits(user)
