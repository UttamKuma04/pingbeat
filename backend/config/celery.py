import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

from celery.schedules import crontab

# Beat schedule
app.conf.beat_schedule = {
    'check-monitors-every-30-seconds': {
        'task': 'monitoring.tasks.check_monitors',
        'schedule': 30.0,
    },
    'cleanup-old-logs-daily': {
        'task': 'monitoring.tasks.cleanup_old_logs',
        'schedule': crontab(hour=0, minute=0),
    },
    'aggregate-apm-metrics-every-minute': {
        'task': 'monitoring.tasks.aggregate_apm_metrics',
        'schedule': 60.0,
    },
    'check-apm-slow-endpoints': {
        'task': 'monitoring.tasks.check_apm_slow_endpoints',
        'schedule': crontab(minute='*/5'),
    },
}
