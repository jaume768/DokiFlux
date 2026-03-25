import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="UserPlan",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plan_type", models.CharField(choices=[("free", "Free"), ("premium", "Premium")], default="free", max_length=20)),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="plan", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "user_plans",
            },
        ),
        migrations.CreateModel(
            name="CreditGrant",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("original_amount", models.DecimalField(decimal_places=6, max_digits=10)),
                ("remaining", models.DecimalField(decimal_places=6, max_digits=10)),
                ("source", models.CharField(choices=[("monthly", "Monthly"), ("purchase", "Purchase")], max_length=20)),
                ("granted_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="credit_grants", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "credit_grants",
                "ordering": ["expires_at"],
            },
        ),
        migrations.CreateModel(
            name="CreditTransaction",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("amount", models.DecimalField(decimal_places=6, max_digits=10)),
                ("tx_type", models.CharField(choices=[("monthly_grant", "Monthly Grant"), ("purchase", "Purchase"), ("generation", "Generation"), ("refund", "Refund"), ("expiry", "Expiry")], max_length=20)),
                ("description", models.TextField(blank=True)),
                ("generation_id", models.IntegerField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("grant", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="transactions", to="billing.creditgrant")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="credit_transactions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "credit_transactions",
                "ordering": ["-created_at"],
            },
        ),
    ]
