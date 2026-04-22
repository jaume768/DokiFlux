from django.contrib import admin

from .models import ChatMessage, ContactRequest, Project, ProjectExportLog


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "user", "updated_at", "created_at"]
    list_filter = ["created_at", "updated_at"]
    search_fields = ["name", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["user"]


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ["id", "project", "role", "message_type", "created_at"]
    list_filter = ["role", "message_type", "created_at"]
    search_fields = ["content"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["project"]


@admin.register(ProjectExportLog)
class ProjectExportLogAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "project", "file_count", "exported_at"]
    list_filter = ["exported_at"]
    search_fields = ["user__email", "project__name"]
    readonly_fields = ["exported_at"]
    raw_id_fields = ["user", "project"]
    date_hierarchy = "exported_at"


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "email", "project_name", "status", "email_sent", "created_at"]
    list_filter = ["status", "email_sent", "created_at"]
    search_fields = ["name", "email", "project_name", "message"]
    readonly_fields = ["created_at"]
    raw_id_fields = ["user", "project"]
    list_editable = ["status"]
