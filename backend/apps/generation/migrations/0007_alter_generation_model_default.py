from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("generation", "0006_add_celery_fields"),
    ]

    operations = [
        migrations.AlterField(
            model_name="generation",
            name="model",
            field=models.CharField(default="claude-sonnet-5-low", max_length=50),
        ),
    ]
