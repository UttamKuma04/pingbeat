import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('config')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

"""Celery app bootstrap.

Beat runs on Render with the Django database scheduler:
`django_celery_beat.schedulers:DatabaseScheduler`.

Keep periodic task definitions in `django_celery_beat` only so each task is
scheduled exactly once. Defining `app.conf.beat_schedule` here in addition to
database-backed `PeriodicTask` entries causes duplicate enqueues.
"""
