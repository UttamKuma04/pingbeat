import atexit
import threading
import time
from datetime import datetime, timezone

import requests
from django.conf import settings


class PingBeatBuffer:
    """Small in-memory metric buffer for the Django APM middleware."""

    def __init__(self):
        self._metrics = []
        self._lock = threading.Lock()
        self._timer_started = False

    def start(self):
        if self._timer_started:
            return
        self._timer_started = True
        self._schedule_flush()
        atexit.register(self.flush)

    def capture(self, metric):
        max_batch_size = getattr(settings, 'PINGBEAT_APM_MAX_BATCH_SIZE', 500)
        should_flush = False

        with self._lock:
            self._metrics.append(metric)
            should_flush = len(self._metrics) >= max_batch_size

        if should_flush:
            threading.Thread(target=self.flush, daemon=True).start()

    def flush(self):
        api_key = getattr(settings, 'PINGBEAT_APM_API_KEY', '')
        ingest_url = getattr(settings, 'PINGBEAT_APM_INGEST_URL', '')
        if not api_key:
            return

        with self._lock:
            metrics = self._metrics[:]
            self._metrics.clear()

        if not metrics:
            return

        if getattr(settings, 'PINGBEAT_APM_LOCAL_CAPTURE', False):
            self._flush_locally(api_key, metrics)
            return

        if not ingest_url:
            return

        try:
            requests.post(
                ingest_url,
                json={'api_key': api_key, 'metrics': metrics},
                timeout=getattr(settings, 'PINGBEAT_APM_TIMEOUT_SECONDS', 5),
            )
        except requests.RequestException:
            pass

    def _flush_locally(self, api_key, metrics):
        try:
            from monitoring.models import Application
            from monitoring.tasks import aggregate_apm_metrics, process_apm_metrics

            application = Application.objects.get(api_key=api_key)
            process_apm_metrics(application.id, metrics)
            aggregate_apm_metrics(60)
        except Exception:
            pass

    def _schedule_flush(self):
        interval = getattr(settings, 'PINGBEAT_APM_FLUSH_INTERVAL_SECONDS', 30)
        timer = threading.Timer(interval, self._flush_and_reschedule)
        timer.daemon = True
        timer.start()

    def _flush_and_reschedule(self):
        self.flush()
        self._schedule_flush()


buffer = PingBeatBuffer()


class PingBeatAPMMiddleware:
    """Capture Django request latency and send batched APM metrics to PingBEAT."""

    def __init__(self, get_response):
        self.get_response = get_response
        buffer.start()

    def __call__(self, request):
        started = time.perf_counter()
        response = self.get_response(request)
        response_time_ms = round((time.perf_counter() - started) * 1000, 2)

        if self._should_capture(request):
            buffer.capture({
                'endpoint': request.path,
                'method': request.method,
                'status_code': response.status_code,
                'response_time_ms': response_time_ms,
                'timestamp': datetime.now(timezone.utc).isoformat(),
            })

        return response

    def _should_capture(self, request):
        if not getattr(settings, 'PINGBEAT_APM_API_KEY', ''):
            return False

        excluded_paths = getattr(settings, 'PINGBEAT_APM_EXCLUDED_PATHS', ())
        return not any(request.path.startswith(path) for path in excluded_paths)
