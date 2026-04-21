import uuid
from decimal import Decimal

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="DemoSession",
            fields=[
                ("session_id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("ip_hash", models.CharField(db_index=True, max_length=64)),
                ("fingerprint_hash", models.CharField(blank=True, db_index=True, default="", max_length=64)),
                ("credits_remaining", models.DecimalField(decimal_places=6, default=Decimal("2.000000"), max_digits=10)),
                ("file_map", models.JSONField(blank=True, default=dict)),
                ("chat_history", models.JSONField(blank=True, default=list)),
                ("framework", models.CharField(default="react", max_length=20)),
                ("initial_prompt", models.TextField(blank=True, default="")),
                ("generation_count", models.PositiveIntegerField(default=0)),
                ("total_input_tokens", models.PositiveIntegerField(default=0)),
                ("total_output_tokens", models.PositiveIntegerField(default=0)),
                ("migrated_project_id", models.IntegerField(blank=True, null=True)),
                ("migrated_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("last_active_at", models.DateTimeField(auto_now=True)),
                (
                    "migrated_to_user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=models.deletion.SET_NULL,
                        related_name="migrated_demo_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "demo_sessions",
                "ordering": ["-last_active_at"],
            },
        ),
        migrations.AddIndex(
            model_name="demosession",
            index=models.Index(fields=["ip_hash", "created_at"], name="demo_sessions_ip_hash_created_idx"),
        ),
        migrations.AddIndex(
            model_name="demosession",
            index=models.Index(fields=["fingerprint_hash", "created_at"], name="demo_sessions_fp_created_idx"),
        ),
    ]
