import logging
import secrets
from django.db import models
from django.contrib.auth.models import User

logger = logging.getLogger(__name__)

def generate_api_key():
    return f"pb_{secrets.token_urlsafe(32)}"

class Monitor(models.Model):
    HTTP_METHOD_CHOICES = [
        ('GET', 'GET'),
        ('POST', 'POST'),
        ('PUT', 'PUT'),
        ('DELETE', 'DELETE'),
        ('HEAD', 'HEAD'),
    ]

    NOTIFICATION_CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('discord', 'Discord'),
        ('slack', 'Slack'),
        ('webhook', 'Custom Webhook'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monitors')
    name = models.CharField(max_length=255)
    url = models.URLField()
    expected_status = models.IntegerField(default=200)
    interval_seconds = models.IntegerField(default=300)
    timeout_seconds = models.IntegerField(default=30)
    is_active = models.BooleanField(default=True)
    email_alerts = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    http_method = models.CharField(max_length=10, choices=HTTP_METHOD_CHOICES, default='GET')
    headers = models.JSONField(default=dict, blank=True)
    body = models.TextField(blank=True, default='')
    keyword = models.CharField(max_length=255, blank=True, null=True)
    webhook_url = models.URLField(blank=True, null=True)
    notification_channel = models.CharField(max_length=20, choices=NOTIFICATION_CHANNEL_CHOICES, default='email')
    tags = models.CharField(max_length=255, blank=True, default='', help_text="Comma-separated tags")
    ssl_expiry = models.DateTimeField(null=True, blank=True)
    ssl_issuer = models.CharField(max_length=255, null=True, blank=True)
    assert_keyword = models.CharField(max_length=255, blank=True, null=True)
    assert_max_response_time_ms = models.IntegerField(blank=True, null=True)

    def __str__(self):
        return f'{self.name} ({self.url})'

    @property
    def last_log(self):
        return self.logs.order_by('-checked_at').first()

    @property
    def is_up(self):
        log = self.last_log
        return log.is_up if log else None


class MonitorLog(models.Model):
    monitor = models.ForeignKey(Monitor, on_delete=models.CASCADE, related_name='logs')
    status_code = models.IntegerField(null=True, blank=True)
    response_time_ms = models.FloatField(null=True, blank=True)
    is_up = models.BooleanField()
    error_message = models.TextField(blank=True, default='')
    checked_at = models.DateTimeField(auto_now_add=True)

    region = models.CharField(max_length=50, default='us-east', blank=True)
    ssl_expiry_date = models.DateTimeField(null=True, blank=True)
    ssl_days_remaining = models.IntegerField(null=True, blank=True)
    ssl_warning = models.BooleanField(default=False)
    failure_reason = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, default='up')

    class Meta:
        ordering = ['-checked_at']
        indexes = [
            models.Index(fields=['monitor', 'checked_at']),
            models.Index(fields=['checked_at']),
        ]

    def __str__(self):
        status_str = self.status.upper() if hasattr(self, 'status') else ('UP' if self.is_up else 'DOWN')
        return f'{self.monitor.name} - {status_str} at {self.checked_at}'


class Incident(models.Model):
    monitor = models.ForeignKey(Monitor, on_delete=models.CASCADE, related_name='incidents')
    started_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(null=True, blank=True)
    error_message = models.TextField(blank=True, default='')
    class Meta:
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['monitor', '-started_at']),
        ]
    def __str__(self):
        status = 'Active' if not self.resolved_at else f'Resolved (Duration: {self.duration_seconds}s)'
        return f'{self.monitor.name} Incident - {status} starting at {self.started_at}'

class StatusPage(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='status_pages')
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    is_public = models.BooleanField(default=True)
    monitors = models.ManyToManyField(Monitor, related_name='status_pages')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.title} ({self.slug})'


class MaintenanceWindow(models.Model):
    monitor = models.ForeignKey(Monitor, on_delete=models.CASCADE, related_name='maintenance_windows')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    label = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-start_time']

    def __str__(self):
        return f'{self.monitor.name} Maintenance ({self.label})'


class Application(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='apm_applications')
    name = models.CharField(max_length=255)
    environment = models.CharField(max_length=100, default='production')
    api_key = models.CharField(max_length=80, unique=True, default=generate_api_key, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'environment']),
        ]

    def __str__(self):
        return f'{self.name} ({self.environment})'


class ApiMetric(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='api_metrics')
    endpoint = models.CharField(max_length=512)
    method = models.CharField(max_length=10)
    status_code = models.IntegerField()
    response_time_ms = models.FloatField()
    timestamp = models.DateTimeField()
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        constraints = [
            models.UniqueConstraint(
                fields=['application', 'endpoint', 'method', 'status_code', 'timestamp'],
                name='apimetric_dedup_constraint',
            )
        ]
        indexes = [
            models.Index(fields=['application', 'timestamp']),
            models.Index(fields=['application', 'endpoint', 'timestamp']),
            models.Index(fields=['application', 'status_code', 'timestamp']),
        ]

    def __str__(self):
        return f'{self.application.name} {self.method} {self.endpoint} {self.status_code}'

class ApiMetricSummary(models.Model):
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name='api_metric_summaries')
    endpoint = models.CharField(max_length=512)
    requests_count = models.IntegerField(default=0)
    avg_response_time = models.FloatField(default=0)
    p95_latency = models.FloatField(default=0)
    p99_latency = models.FloatField(default=0)
    error_rate = models.FloatField(default=0)
    minute_bucket = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-minute_bucket']
        constraints = [
            models.UniqueConstraint(
                fields=['application', 'endpoint', 'minute_bucket'],
                name='unique_apm_summary_per_endpoint_minute',
            )
        ]
        indexes = [
            models.Index(fields=['application', 'minute_bucket']),
            models.Index(fields=['application', 'endpoint', 'minute_bucket']),
        ]

    def __str__(self):
        return f'{self.application.name} {self.endpoint} {self.minute_bucket}'


from django.db.models.signals import post_migrate
from django.dispatch import receiver

@receiver(post_migrate)
def setup_periodic_tasks(sender, **kwargs):
    if sender.name != 'monitoring':
        return
    try:
        from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
    except ImportError:
        # django_celery_beat not installed/migrated yet - nothing to do.
        return

    try:
        # expire_seconds tells the broker to drop a message rather than run
        # it late if the worker was offline when it should have fired.
        # Without this, an outage lets Beat's on-schedule dispatches pile up
        # unboundedly in Redis; when the worker comes back it has to drain
        # the entire backlog in one burst, which can be enough load on its
        # own to crash the worker again right after it recovers.
        schedule_30s, _ = IntervalSchedule.objects.get_or_create(every=30, period='seconds')
        PeriodicTask.objects.update_or_create(
            name='Check Monitors',
            defaults={
                'task': 'monitoring.tasks.check_monitors',
                'interval': schedule_30s,
                'expire_seconds': 25,
            }
        )
        cron_midnight, _ = CrontabSchedule.objects.get_or_create(hour=0, minute=0)
        PeriodicTask.objects.update_or_create(
            name='Cleanup Old Logs',
            defaults={
                'task': 'monitoring.tasks.cleanup_old_logs',
                'crontab': cron_midnight,
                'expire_seconds': 3600,
            }
        )

        schedule_60s, _ = IntervalSchedule.objects.get_or_create(every=60, period='seconds')
        PeriodicTask.objects.update_or_create(
            name='Aggregate APM Metrics',
            defaults={
                'task': 'monitoring.tasks.aggregate_apm_metrics',
                'interval': schedule_60s,
                'expire_seconds': 55,
            }
        )

        cron_5m, _ = CrontabSchedule.objects.get_or_create(minute='*/5')
        PeriodicTask.objects.update_or_create(
            name='Check APM Slow Endpoints',
            defaults={
                'task': 'monitoring.tasks.check_apm_slow_endpoints',
                'crontab': cron_5m,
                'expire_seconds': 270,
            }
        )
    except Exception:
        logger.exception("Failed to set up Celery Beat periodic tasks after migrate")