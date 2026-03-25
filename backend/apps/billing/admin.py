from django.contrib import admin

from .models import CreditGrant, CreditTransaction, UserPlan


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
