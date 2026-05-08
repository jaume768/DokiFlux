from django.conf import settings
from django.db import models
from django.utils.text import slugify
import os
import uuid


class Project(models.Model):
    FRAMEWORK_CHOICES = [
        ("react", "React + Vite"),
        ("vue", "Vue 3 + Vite"),
        ("nextjs", "Next.js"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    framework = models.CharField(
        max_length=20,
        choices=FRAMEWORK_CHOICES,
        default="react",
        help_text="UI framework used to scaffold and generate this project.",
    )
    file_map = models.JSONField(default=dict, blank=True)
    last_used_model = models.CharField(max_length=50, blank=True, default="")
    file_map_url = models.URLField(
        max_length=500, null=True, blank=True,
        help_text="S3 URL for file_map storage (prepared, not yet active).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        db_table = "projects"

    def __str__(self):
        return f"{self.name} ({self.user.email})"

    @property
    def file_map_size_kb(self):
        """Accurate size of the serialized file_map in KB (UTF-8 bytes)."""
        import json

        return len(json.dumps(self.file_map).encode("utf-8")) / 1024


class ChatMessage(models.Model):
    ROLE_CHOICES = [
        ("user", "User"),
        ("assistant", "Assistant"),
    ]
    TYPE_CHOICES = [
        ("chat", "Chat"),
        ("code", "Code"),
        ("error", "Error"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES)
    content = models.TextField()
    message_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default="chat"
    )
    usage = models.JSONField(null=True, blank=True)
    raw_code = models.TextField(blank=True)
    generation_id = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        db_table = "chat_messages"

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."


def project_asset_upload_path(instance, filename):
    ext = os.path.splitext(filename)[1].lower()
    safe_name = slugify(os.path.splitext(filename)[0])[:60] or "asset"
    return f"projects/{instance.project_id}/assets/{uuid.uuid4().hex}-{safe_name}{ext}"


class ProjectAsset(models.Model):
    KIND_CHOICES = [
        ("logo", "Logo"),
        ("hero", "Hero"),
        ("product", "Product"),
        ("gallery", "Gallery"),
        ("background", "Background"),
        ("other", "Other"),
    ]

    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name="assets",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="project_assets",
    )
    file = models.ImageField(upload_to=project_asset_upload_path)
    original_name = models.CharField(max_length=255)
    kind = models.CharField(max_length=20, choices=KIND_CHOICES, default="other")
    mime_type = models.CharField(max_length=100)
    size = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        db_table = "project_assets"

    def __str__(self):
        return f"{self.original_name} ({self.project_id})"


class ProjectExportLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_logs",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="export_logs",
    )
    file_count = models.PositiveIntegerField(default=0)
    exported_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-exported_at"]
        db_table = "project_export_logs"

    def __str__(self):
        user_str = self.user.email if self.user else "anon"
        project_str = self.project.name if self.project else "deleted"
        return f"{user_str} — {project_str} @ {self.exported_at:%Y-%m-%d %H:%M}"


class ContactRequest(models.Model):
    """A 'take this project to production' lead captured from the UI."""

    STATUS_CHOICES = [
        ("new", "New"),
        ("contacted", "Contacted"),
        ("won", "Won"),
        ("lost", "Lost"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_requests",
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="contact_requests",
    )
    name = models.CharField(max_length=200)
    email = models.EmailField()
    phone = models.CharField(max_length=40, blank=True, default="")
    project_name = models.CharField(max_length=200, blank=True, default="")
    message = models.TextField(blank=True, default="")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="new")
    email_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        db_table = "contact_requests"

    def __str__(self):
        return f"{self.name} <{self.email}> ({self.status})"
