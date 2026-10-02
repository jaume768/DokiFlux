"""
Admin statistics dashboard.
Aggregates product, generation, demo, billing and support metrics.
Read-only: no migrations needed.
"""
from datetime import timedelta
from decimal import Decimal

from django.contrib.admin.views.decorators import staff_member_required
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate
from django.shortcuts import render
from django.utils.timezone import now

from apps.billing.models import (
    BillingPayment,
    CreditGrant,
    CreditTransaction,
    UserPlan,
)
from apps.demo.models import DemoSession
from apps.generation.models import Generation
from apps.projects.models import ContactRequest, Project
from apps.users.models import User


def _delta(days):
    return now() - timedelta(days=days)


def _count_since(qs, field, days):
    return qs.filter(**{f"{field}__gte": _delta(days)}).count()


def _series(qs, field, days):
    """Return [{date, count}] grouped by day for last `days` days."""
    start = _delta(days)
    rows = (
        qs.filter(**{f"{field}__gte": start})
        .annotate(d=TruncDate(field))
        .values("d")
        .annotate(count=Count("id"))
        .order_by("d")
    )
    by_day = {r["d"].isoformat(): r["count"] for r in rows}
    out = []
    today = now().date()
    for i in range(days, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        out.append({"date": d, "count": by_day.get(d, 0)})
    return out


@staff_member_required
def dashboard_view(request):
    today = now()

    # ── Users ───────────────────────────────────────────
    users_total = User.objects.count()
    users_today = _count_since(User.objects, "date_joined", 1)
    users_7d = _count_since(User.objects, "date_joined", 7)
    users_30d = _count_since(User.objects, "date_joined", 30)
    users_onboarded = User.objects.filter(username__isnull=False).count()
    users_verified = User.objects.filter(is_email_verified=True).count()
    users_google = User.objects.filter(auth_provider="google").count()
    users_email = User.objects.filter(auth_provider="email").count()

    active_user_ids_7d = (
        Generation.objects.filter(created_at__gte=_delta(7))
        .values_list("user_id", flat=True)
        .distinct()
    )
    active_user_ids_30d = (
        Generation.objects.filter(created_at__gte=_delta(30))
        .values_list("user_id", flat=True)
        .distinct()
    )
    active_7d = len(set(active_user_ids_7d))
    active_30d = len(set(active_user_ids_30d))

    plans_qs = UserPlan.objects.values("plan_type").annotate(c=Count("id"))
    plans_count = {row["plan_type"]: row["c"] for row in plans_qs}
    premium_count = plans_count.get("premium", 0)
    free_count = plans_count.get("free", 0)
    pending_cancellation = UserPlan.objects.filter(cancel_at_period_end=True).count()

    # ── Generations ─────────────────────────────────────
    gen_total = Generation.objects.count()
    gen_today = _count_since(Generation.objects, "created_at", 1)
    gen_7d = _count_since(Generation.objects, "created_at", 7)
    gen_30d = _count_since(Generation.objects, "created_at", 30)

    gen_status_qs = Generation.objects.values("status").annotate(c=Count("id"))
    gen_status = {row["status"]: row["c"] for row in gen_status_qs}

    gen_completed_30d = Generation.objects.filter(
        created_at__gte=_delta(30), status="completed"
    ).count()
    gen_failed_30d = Generation.objects.filter(
        created_at__gte=_delta(30), status="failed"
    ).count()
    gen_total_30d = max(gen_30d, 1)
    success_rate_30d = round(100 * gen_completed_30d / gen_total_30d, 1)

    top_models = list(
        Generation.objects.filter(created_at__gte=_delta(30))
        .values("model")
        .annotate(c=Count("id"))
        .order_by("-c")[:8]
    )

    tokens_30d = Generation.objects.filter(created_at__gte=_delta(30)).aggregate(
        inp=Sum("input_tokens"), out=Sum("output_tokens"), cost=Sum("cost")
    )
    tokens_in_30d = tokens_30d["inp"] or 0
    tokens_out_30d = tokens_30d["out"] or 0
    cost_30d = tokens_30d["cost"] or Decimal("0")

    # ── Projects ────────────────────────────────────────
    projects_total = Project.objects.count()
    projects_30d = _count_since(Project.objects, "created_at", 30)

    # ── Demo (anonymous) ────────────────────────────────
    demo_total = DemoSession.objects.count()
    demo_today = _count_since(DemoSession.objects, "created_at", 1)
    demo_7d = _count_since(DemoSession.objects, "created_at", 7)
    demo_30d = _count_since(DemoSession.objects, "created_at", 30)
    demo_migrated = DemoSession.objects.filter(migrated_to_user__isnull=False).count()
    demo_with_gen = DemoSession.objects.filter(generation_count__gt=0).count()
    demo_conversion = (
        round(100 * demo_migrated / demo_total, 1) if demo_total else 0.0
    )
    demo_engagement = (
        round(100 * demo_with_gen / demo_total, 1) if demo_total else 0.0
    )

    # ── Billing ─────────────────────────────────────────
    paid_qs = BillingPayment.objects.filter(
        Q(status__iexact="paid") | Q(status__iexact="succeeded") | Q(amount_paid__gt=0)
    )
    revenue_30d = (
        paid_qs.filter(created_at__gte=_delta(30)).aggregate(s=Sum("amount_paid"))["s"]
        or Decimal("0")
    )
    revenue_total = paid_qs.aggregate(s=Sum("amount_paid"))["s"] or Decimal("0")
    topups_30d = paid_qs.filter(kind="topup", created_at__gte=_delta(30)).count()
    subs_payments_30d = paid_qs.filter(
        kind="subscription", created_at__gte=_delta(30)
    ).count()

    total_debt = UserPlan.objects.aggregate(s=Sum("debt"))["s"] or Decimal("0")

    credits_remaining_now = (
        CreditGrant.objects.filter(remaining__gt=0, expires_at__gt=now()).aggregate(
            s=Sum("remaining")
        )["s"]
        or Decimal("0")
    )
    credits_granted_30d = CreditTransaction.objects.filter(
        created_at__gte=_delta(30), tx_type__in=["monthly_grant", "purchase"]
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    credits_consumed_30d = CreditTransaction.objects.filter(
        created_at__gte=_delta(30), tx_type="generation"
    ).aggregate(s=Sum("amount"))["s"] or Decimal("0")
    credits_consumed_30d = abs(credits_consumed_30d)

    # ── Support ─────────────────────────────────────────
    contacts_status = {
        row["status"]: row["c"]
        for row in ContactRequest.objects.values("status").annotate(c=Count("id"))
    }
    contacts_new_7d = _count_since(
        ContactRequest.objects.filter(status="new"), "created_at", 7
    )
    contacts_total = ContactRequest.objects.count()

    # ── Time series for charts (last 30 days) ───────────
    series_users = _series(User.objects, "date_joined", 30)
    series_generations = _series(Generation.objects, "created_at", 30)
    series_demo = _series(DemoSession.objects, "created_at", 30)

    context = {
        "title": "Statistics dashboard",
        "today": today,
        # users
        "users_total": users_total,
        "users_today": users_today,
        "users_7d": users_7d,
        "users_30d": users_30d,
        "users_onboarded": users_onboarded,
        "users_verified": users_verified,
        "users_google": users_google,
        "users_email": users_email,
        "active_7d": active_7d,
        "active_30d": active_30d,
        "premium_count": premium_count,
        "free_count": free_count,
        "pending_cancellation": pending_cancellation,
        # generations
        "gen_total": gen_total,
        "gen_today": gen_today,
        "gen_7d": gen_7d,
        "gen_30d": gen_30d,
        "gen_status": gen_status,
        "gen_completed_30d": gen_completed_30d,
        "gen_failed_30d": gen_failed_30d,
        "success_rate_30d": success_rate_30d,
        "top_models": top_models,
        "tokens_in_30d": tokens_in_30d,
        "tokens_out_30d": tokens_out_30d,
        "cost_30d": cost_30d,
        # projects
        "projects_total": projects_total,
        "projects_30d": projects_30d,
        # demo
        "demo_total": demo_total,
        "demo_today": demo_today,
        "demo_7d": demo_7d,
        "demo_30d": demo_30d,
        "demo_migrated": demo_migrated,
        "demo_conversion": demo_conversion,
        "demo_engagement": demo_engagement,
        # billing
        "revenue_30d": revenue_30d,
        "revenue_total": revenue_total,
        "topups_30d": topups_30d,
        "subs_payments_30d": subs_payments_30d,
        "total_debt": total_debt,
        "credits_remaining_now": credits_remaining_now,
        "credits_granted_30d": credits_granted_30d,
        "credits_consumed_30d": credits_consumed_30d,
        # support
        "contacts_status": contacts_status,
        "contacts_new_7d": contacts_new_7d,
        "contacts_total": contacts_total,
        # series
        "series_users": series_users,
        "series_generations": series_generations,
        "series_demo": series_demo,
    }
    return render(request, "admin_stats/dashboard.html", context)
