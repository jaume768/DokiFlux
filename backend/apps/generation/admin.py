from django.contrib import admin

from .models import Generation


@admin.register(Generation)
class GenerationAdmin(admin.ModelAdmin):
    list_display = [
        "id",
        "user",
        "project",
        "model",
        "status",
        "input_tokens",
        "output_tokens",
        "cost",
        "created_at",
    ]
    list_filter = ["status", "model", "created_at"]
    search_fields = ["user__email", "project__name", "prompt"]
    readonly_fields = ["created_at", "completed_at"]
    raw_id_fields = ["user", "project"]
