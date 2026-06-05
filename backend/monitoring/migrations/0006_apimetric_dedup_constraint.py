from django.db import migrations, models
from django.db.models import Count


def dedupe_apm_metrics(apps, schema_editor):
    ApiMetric = apps.get_model('monitoring', 'ApiMetric')
    groups = ApiMetric.objects.values(
        'application_id', 'endpoint', 'method', 'status_code', 'timestamp'
    ).annotate(row_count=Count('id')).filter(row_count__gt=1)

    for group in groups:
        ids = list(ApiMetric.objects.filter(
            application_id=group['application_id'],
            endpoint=group['endpoint'],
            method=group['method'],
            status_code=group['status_code'],
            timestamp=group['timestamp'],
        ).order_by('id').values_list('id', flat=True))
        ApiMetric.objects.filter(id__in=ids[1:]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0005_application_apimetricsummary_apimetric_and_more'),
    ]

    operations = [
        migrations.RunPython(dedupe_apm_metrics, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='apimetric',
            constraint=models.UniqueConstraint(
                fields=('application', 'endpoint', 'method', 'status_code', 'timestamp'),
                name='apimetric_dedup_constraint',
            ),
        ),
    ]
