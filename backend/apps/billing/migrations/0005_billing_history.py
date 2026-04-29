# Generated for billing history persistence

import django.db.models.deletion
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0004_add_debt_and_debt_tx_types"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="StripeEvent",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("event_id", models.CharField(max_length=120, unique=True)),
                ("event_type", models.CharField(max_length=120)),
                ("processed_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={
                "db_table": "stripe_events",
                "ordering": ["-processed_at"],
            },
        ),
        migrations.CreateModel(
            name="BillingSubscription",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("stripe_subscription_id", models.CharField(max_length=120, unique=True)),
                ("stripe_customer_id", models.CharField(blank=True, default="", max_length=120)),
                ("stripe_price_id", models.CharField(blank=True, default="", max_length=120)),
                ("status", models.CharField(blank=True, default="", max_length=40)),
                ("plan_type", models.CharField(default="premium", max_length=20)),
                ("current_period_start", models.DateTimeField(blank=True, null=True)),
                ("current_period_end", models.DateTimeField(blank=True, null=True)),
                ("cancel_at_period_end", models.BooleanField(default=False)),
                ("cancel_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="billing_subscriptions", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "billing_subscriptions",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BillingInvoice",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("stripe_invoice_id", models.CharField(max_length=120, unique=True)),
                ("stripe_subscription_id", models.CharField(blank=True, default="", max_length=120)),
                ("stripe_customer_id", models.CharField(blank=True, default="", max_length=120)),
                ("number", models.CharField(blank=True, default="", max_length=120)),
                ("status", models.CharField(blank=True, default="", max_length=40)),
                ("billing_reason", models.CharField(blank=True, default="", max_length=80)),
                ("hosted_invoice_url", models.URLField(blank=True, default="", max_length=600)),
                ("invoice_pdf", models.URLField(blank=True, default="", max_length=600)),
                ("currency", models.CharField(default="eur", max_length=10)),
                ("subtotal", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=10)),
                ("tax", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=10)),
                ("total", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=10)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=10)),
                ("period_start", models.DateTimeField(blank=True, null=True)),
                ("period_end", models.DateTimeField(blank=True, null=True)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="billing_invoices", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "billing_invoices",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="BillingPayment",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("subscription", "Subscription"), ("topup", "Top-up"), ("other", "Other")], default="other", max_length=30)),
                ("status", models.CharField(blank=True, default="", max_length=40)),
                ("stripe_checkout_session_id", models.CharField(blank=True, default="", max_length=120)),
                ("stripe_payment_intent_id", models.CharField(blank=True, default="", max_length=120)),
                ("stripe_invoice_id", models.CharField(blank=True, default="", max_length=120)),
                ("stripe_customer_id", models.CharField(blank=True, default="", max_length=120)),
                ("description", models.CharField(blank=True, default="", max_length=255)),
                ("currency", models.CharField(default="eur", max_length=10)),
                ("amount_total", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=10)),
                ("amount_paid", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=10)),
                ("paid_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="billing_payments", to=settings.AUTH_USER_MODEL)),
            ],
            options={
                "db_table": "billing_payments",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["user", "-created_at"], name="billing_pay_user_id_7e1a0e_idx"),
                    models.Index(fields=["stripe_checkout_session_id"], name="billing_pay_stripe__0e93af_idx"),
                    models.Index(fields=["stripe_payment_intent_id"], name="billing_pay_stripe__a8fe59_idx"),
                    models.Index(fields=["stripe_invoice_id"], name="billing_pay_stripe__db74f8_idx"),
                ],
            },
        ),
    ]
