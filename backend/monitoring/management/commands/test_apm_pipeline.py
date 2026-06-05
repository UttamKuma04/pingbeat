import random
import time

from django.core.management.base import BaseCommand

from monitoring.models import ApiMetric, Application
from monitoring.tasks import aggregate_apm_metrics, process_apm_metrics


class Command(BaseCommand):
    help = 'Send synthetic APM metrics to test the local pipeline.'

    def add_arguments(self, parser):
        parser.add_argument('--app-id', type=int, required=True)
        parser.add_argument('--count', type=int, default=100)

    def handle(self, *args, **options):
        try:
            app = Application.objects.get(pk=options['app_id'])
        except Application.DoesNotExist:
            self.stderr.write(f"Application {options['app_id']} not found.")
            return

        endpoints = ['/api/users/', '/api/monitors/', '/api/apm/analytics/', '/api/logs/']
        methods = ['GET', 'POST', 'DELETE']
        status_codes = [200, 200, 200, 200, 201, 400, 404, 500]
        metrics = [
            {
                'endpoint': random.choice(endpoints),
                'method': random.choice(methods),
                'status_code': random.choice(status_codes),
                'response_time_ms': random.uniform(20, 800),
                'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
            }
            for _ in range(options['count'])
        ]

        self.stdout.write(f"Inserting {options['count']} synthetic metrics for '{app.name}'...")
        process_apm_metrics(app.pk, metrics)
        self.stdout.write('Running aggregation...')
        aggregate_apm_metrics(minutes_back=10)

        count = ApiMetric.objects.filter(application=app).count()
        self.stdout.write(self.style.SUCCESS(f'Done. Total raw metrics for app: {count}'))
