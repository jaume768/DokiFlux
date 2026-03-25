import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Generation",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("prompt", models.TextField()),
                ("model", models.CharField(default="gpt-5.4", max_length=50)),
                ("input_tokens", models.IntegerField(default=0)),
                ("output_tokens", models.IntegerField(default=0)),
                ("cost", models.DecimalField(decimal_places=6, default=0, max_digits=10)),
                ("status", models.CharField(choices=[("pending", "Pending"), ("streaming", "Streaming"), ("completed", "Completed"), ("failed", "Failed"), ("no_changes", "No Changes")], default="pending", max_length=20)),
                ("files_changed", models.IntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("completed_at", models.DateTimeField(blank=True, null=True)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="generations", to="projects.project")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="generations", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "generations",
                "ordering": ["-created_at"],
            },
        ),
    ]
