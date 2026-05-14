from decimal import Decimal

from django import forms
from django.contrib import admin, messages

from .models import (
    BillingInvoice,
    BillingPayment,
    BillingSubscription,
    CreditGrant,
    CreditTransaction,
    StripeEvent,
    UserPlan,
)
from .services import admin_adjust_balance, get_balance


class UserPlanAdminForm(forms.ModelForm):
    set_balance = forms.DecimalField(
        required=False,
        max_digits=12,
        decimal_places=6,
        label="Fijar saldo a (créditos)",
        help_text=(
            "Deja vacío para no cambiar. Si introduces un valor, se ajusta el "
            "saldo del usuario a esa cantidad: si sube, paga primero la deuda "
            "y crea un CreditGrant con el resto; si baja, descuenta FIFO de "
            "los grants activos. Queda registrado en CreditTransaction con "
            "prefijo [admin]."
        ),
    )
    adjust_reason = forms.CharField(
        required=False,
        max_length=200,
        label="Motivo del ajuste",
        help_text="Aparecerá en la descripción de la transacción.",
    )

    class Meta:
        model = UserPlan
        fields = "__all__"


@admin.register(UserPlan)
class UserPlanAdmin(admin.ModelAdmin):
    form = UserPlanAdminForm
    list_display = ["id", "user", "plan_type", "current_balance", "debt", "started_at"]
    list_filter = ["plan_type"]
    search_fields = ["user__email"]
    raw_id_fields = ["user"]
    readonly_fields = ["started_at", "current_balance"]
    fieldsets = (
        (None, {
            "fields": ("user", "plan_type", "started_at"),
        }),
        ("Saldo", {
            "fields": ("current_balance", "debt", "set_balance", "adjust_reason"),
        }),
        ("Stripe", {
            "fields": (
                "stripe_customer_id",
                "stripe_subscription_id",
                "cancel_at_period_end",
                "cancel_at",
            ),
        }),
    )

    @admin.display(description="Saldo actual")
    def current_balance(self, obj):
        if obj.pk is None or obj.user_id is None:
            return "—"
        return f"{get_balance(obj.user):.6f}"

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        target = form.cleaned_data.get("set_balance")
        if target is None:
            return
        reason = form.cleaned_data.get("adjust_reason") or f"set by {request.user.email}"
        current = get_balance(obj.user)
        delta = Decimal(str(target)) - current
        if delta == 0:
            messages.info(request, "Saldo sin cambios (delta = 0).")
            return
        new_balance = admin_adjust_balance(obj.user, delta, reason=reason)
        messages.success(
            request,
            f"Saldo ajustado: {current:.6f} → {new_balance:.6f} (delta {delta:+.6f}).",
        )


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
