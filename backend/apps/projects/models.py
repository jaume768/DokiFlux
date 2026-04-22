from django.conf import settings
from django.db import models


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
