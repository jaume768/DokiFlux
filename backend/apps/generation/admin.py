from django.contrib import admin

from .models import Generation


@admin.register(Generation)
class GenerationAdmin(admin.ModelAdmin):
    @admin.display(description="Project ID", ordering="project_id")
    def get_project_id(self, obj):
        return obj.project_id

    list_display = [
        "id",
        "user",
        "get_project_id",
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
