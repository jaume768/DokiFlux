import sys
from django.conf import settings
from django.db import models


class Project(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    file_map = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        db_table = "projects"

    def __str__(self):
        return f"{self.name} ({self.user.email})"

    @property
    def file_map_size_kb(self):
        """Approximate size of the serialized file_map in KB."""
        import json

        return sys.getsizeof(json.dumps(self.file_map)) / 1024


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
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        db_table = "chat_messages"

    def __str__(self):
        return f"[{self.role}] {self.content[:50]}..."
