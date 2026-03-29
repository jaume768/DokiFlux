from django.conf import settings
from django.db import models


class Generation(models.Model):
    """Audit log for every generation request."""

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("streaming", "Streaming"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
        ("failed", "Failed"),
        ("no_changes", "No Changes"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="generations",
    )
    project = models.ForeignKey(
        "projects.Project",
        on_delete=models.CASCADE,
        related_name="generations",
    )
    prompt = models.TextField()
    model = models.CharField(max_length=50, default="gpt-5.4")
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cost = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    files_changed = models.IntegerField(default=0)
    file_map_snapshot = models.JSONField(
        null=True, blank=True,
        help_text="Snapshot of project file_map BEFORE this generation (for restore).",
    )
    result_file_map = models.JSONField(
        null=True, blank=True,
        help_text="Merged file_map AFTER this generation completed (for restore).",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "generations"
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"Gen #{self.id} [{self.status}] — "
            f"{self.user.email} / {self.project.name}"
        )
