from decimal import Decimal

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0003_add_cancellation_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="userplan",
            name="debt",
            field=models.DecimalField(
                decimal_places=6, default=Decimal("0"), max_digits=10
            ),
        ),
        migrations.AlterField(
            model_name="credittransaction",
            name="tx_type",
            field=models.CharField(
                choices=[
                    ("monthly_grant", "Monthly Grant"),
                    ("purchase", "Purchase"),
                    ("generation", "Generation"),
                    ("refund", "Refund"),
                    ("expiry", "Expiry"),
                    ("debt", "Debt"),
                    ("debt_repaid", "Debt Repaid"),
                ],
                max_length=20,
            ),
        ),
    ]
