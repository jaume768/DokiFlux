import uuid
from decimal import Decimal

from django.conf import settings
from django.db import models


class DemoSession(models.Model):
    """
    Anonymous demo session — lives in a browser cookie.
    Tracks 2€ budget per session, anti-abuse identity, and the generated
    project state until the user registers (and the session is migrated).
    """

    session_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ip_hash = models.CharField(max_length=64, db_index=True)
    fingerprint_hash = models.CharField(max_length=64, db_index=True, blank=True, default="")
    credits_remaining = models.DecimalField(
        max_digits=10, decimal_places=6, default=Decimal("2.000000"),
    )
    file_map = models.JSONField(default=dict, blank=True)
    chat_history = models.JSONField(default=list, blank=True)
    framework = models.CharField(max_length=20, default="react")
    initial_prompt = models.TextField(blank=True, default="")

    # Anti-abuse counters
    generation_count = models.PositiveIntegerField(default=0)
    total_input_tokens = models.PositiveIntegerField(default=0)
    total_output_tokens = models.PositiveIntegerField(default=0)

    # Migration tracking (set when user signs up / logs in and keeps the project)
    migrated_to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="migrated_demo_sessions",
    )
    migrated_project_id = models.IntegerField(null=True, blank=True)
    migrated_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    last_active_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "demo_sessions"
        ordering = ["-last_active_at"]
        indexes = [
            models.Index(fields=["ip_hash", "created_at"]),
            models.Index(fields=["fingerprint_hash", "created_at"]),
        ]

    def __str__(self):
        return f"DemoSession {self.session_id} (${self.credits_remaining})"

    @property
    def is_migrated(self) -> bool:
        return self.migrated_to_user_id is not None

    @property
    def has_credits(self) -> bool:
        return self.credits_remaining > 0
