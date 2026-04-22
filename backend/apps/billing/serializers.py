from rest_framework import serializers

from .models import CreditGrant, CreditTransaction, UserPlan
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


class PlanDefinitionSerializer(serializers.Serializer):
    name = serializers.CharField()
    price_monthly = serializers.DecimalField(max_digits=10, decimal_places=2)
    monthly_credits = serializers.DecimalField(max_digits=10, decimal_places=2)
    messages_per_day = serializers.IntegerField()
    show_badge = serializers.BooleanField()
