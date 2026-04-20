from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("projects", "0005_contactrequest"),
    ]

    operations = [
        migrations.AddField(
            model_name="project",
            name="framework",
            field=models.CharField(
                choices=[
                    ("react", "React + Vite"),
                    ("vue", "Vue 3 + Vite"),
                    ("nextjs", "Next.js"),
                ],
                default="react",
                help_text="UI framework used to scaffold and generate this project.",
                max_length=20,
            ),
        ),
    ]
