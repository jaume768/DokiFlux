from rest_framework import serializers

from .models import BillingInvoice, BillingPayment, BillingSubscription, CreditTransaction, UserPlan
from .plans import PLAN_DEFINITIONS


class UserPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPlan
        fields = ["plan_type", "started_at"]


class BalanceSerializer(serializers.Serializer):
    balance = serializers.DecimalField(max_digits=10, decimal_places=6)
    plan = UserPlanSerializer()


class CreditTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CreditTransaction
        fields = [
            "id",
            "amount",
            "tx_type",
            "description",
            "generation_id",
            "created_at",
        ]


class BillingPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingPayment
        fields = [
            "id",
            "kind",
            "status",
            "description",
            "currency",
            "amount_total",
            "amount_paid",
            "stripe_checkout_session_id",
            "stripe_payment_intent_id",
            "stripe_invoice_id",
            "paid_at",
            "created_at",
        ]


class BillingInvoiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingInvoice
        fields = [
            "id",
            "stripe_invoice_id",
            "stripe_subscription_id",
            "number",
            "status",
            "billing_reason",
            "hosted_invoice_url",
            "invoice_pdf",
            "currency",
            "subtotal",
            "tax",
            "total",
            "amount_paid",
            "period_start",
            "period_end",
            "paid_at",
            "created_at",
        ]


class BillingSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillingSubscription
        fields = [
            "id",
            "stripe_subscription_id",
            "stripe_price_id",
            "status",
            "plan_type",
            "current_period_start",
            "current_period_end",
            "cancel_at_period_end",
            "cancel_at",
            "created_at",
            "updated_at",
        ]


class PlanDefinitionSerializer(serializers.Serializer):
    name = serializers.CharField()
    price_monthly = serializers.DecimalField(max_digits=10, decimal_places=2)
    monthly_credits = serializers.DecimalField(max_digits=10, decimal_places=2)
    messages_per_day = serializers.IntegerField()
    show_badge = serializers.BooleanField()
