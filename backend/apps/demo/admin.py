from django.contrib import admin

from .models import DemoSession


@admin.register(DemoSession)
class DemoSessionAdmin(admin.ModelAdmin):
    list_display = (
        "session_id", "credits_remaining", "generation_count",
        "migrated_to_user", "created_at", "last_active_at",
    )
    list_filter = ("framework", "created_at")
    search_fields = ("session_id", "ip_hash", "fingerprint_hash", "initial_prompt")
    readonly_fields = (
        "session_id", "ip_hash", "fingerprint_hash", "total_input_tokens",
        "total_output_tokens", "generation_count", "created_at", "last_active_at",
    )
