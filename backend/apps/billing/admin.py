from django.contrib import admin

from .models import (
    BillingInvoice,
    BillingPayment,
    BillingSubscription,
    CreditGrant,
    CreditTransaction,
    StripeEvent,
    UserPlan,
)


@admin.register(UserPlan)
class UserPlanAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "plan_type", "started_at"]
    list_filter = ["plan_type"]
    search_fields = ["user__email"]
    raw_id_fields = ["user"]


@admin.register(CreditGrant)
class CreditGrantAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "source",
        "original_amount",
        "remaining",
        "granted_at",
        "expires_at",
    ]
    list_filter = ["source", "granted_at"]
    search_fields = ["user__email"]
    raw_id_fields = ["user"]


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "amount",
        "tx_type",
        "generation_id",
        "created_at",
    ]
    list_filter = ["tx_type", "created_at"]
    search_fields = ["user__email", "description"]
    raw_id_fields = ["user", "grant"]


@admin.register(StripeEvent)
class StripeEventAdmin(admin.ModelAdmin):
    list_display = ["event_id", "event_type", "processed_at"]
    list_filter = ["event_type", "processed_at"]
    search_fields = ["event_id", "event_type"]
    readonly_fields = ["event_id", "event_type", "processed_at"]


@admin.register(BillingSubscription)
class BillingSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "status", "stripe_subscription_id", "current_period_end", "cancel_at_period_end"]
    list_filter = ["status", "cancel_at_period_end", "created_at"]
    search_fields = ["user__email", "stripe_customer_id", "stripe_subscription_id"]
    raw_id_fields = ["user"]


@admin.register(BillingInvoice)
class BillingInvoiceAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "number", "status", "total", "currency", "paid_at"]
    list_filter = ["status", "billing_reason", "created_at"]
    search_fields = ["user__email", "stripe_invoice_id", "number", "stripe_customer_id"]
    raw_id_fields = ["user"]


@admin.register(BillingPayment)
class BillingPaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "kind", "status", "amount_paid", "currency", "paid_at"]
    list_filter = ["kind", "status", "created_at"]
    search_fields = [
        "user__email",
        "stripe_checkout_session_id",
        "stripe_payment_intent_id",
        "stripe_invoice_id",
        "stripe_customer_id",
    ]
    raw_id_fields = ["user"]
