from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0006_apimetric_dedup_constraint'),
    ]

    operations = [
        migrations.AddField(
            model_name='apimetric',
            name='error_message',
            field=models.TextField(blank=True, null=True),
        ),
    ]
