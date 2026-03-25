from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CreditTransaction
from .plans import PLAN_DEFINITIONS
from .serializers import (
    CreditTransactionSerializer,
    PlanDefinitionSerializer,
)
from .services import get_balance


class BalanceView(APIView):
    """GET /api/billing/balance/ → current balance + active plan."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        balance = get_balance(request.user)
        plan = getattr(request.user, "plan", None)
        return Response(
            {
                "balance": str(balance),
                "plan": {
                    "plan_type": plan.plan_type if plan else "free",
                    "started_at": (
                        plan.started_at.isoformat() if plan else None
                    ),
                },
            }
        )


class TransactionListView(generics.ListAPIView):
    """GET /api/billing/transactions/ → paginated transaction history."""

    serializer_class = CreditTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CreditTransaction.objects.filter(user=self.request.user)


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
