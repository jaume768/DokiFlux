from django.conf import settings
from django.db import migrations, models
import apps.projects.models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0007_projectexportlog"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ProjectAsset",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("file", models.ImageField(upload_to=apps.projects.models.project_asset_upload_path)),
                ("original_name", models.CharField(max_length=255)),
                ("kind", models.CharField(choices=[("logo", "Logo"), ("hero", "Hero"), ("product", "Product"), ("gallery", "Gallery"), ("background", "Background"), ("other", "Other")], default="other", max_length=20)),
                ("mime_type", models.CharField(max_length=100)),
                ("size", models.PositiveIntegerField(default=0)),
                ("width", models.PositiveIntegerField(blank=True, null=True)),
                ("height", models.PositiveIntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("project", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="assets", to="projects.project")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="project_assets", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "ordering": ["-created_at"],
                "db_table": "project_assets",
            },
        ),
    ]
