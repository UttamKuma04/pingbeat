import csv
from django.core.cache import cache
from datetime import timedelta
from django.utils import timezone
from django.db.models import Avg, Min, Max, Count, Sum, Q, Prefetch, Subquery, OuterRef
from django.db.models.functions import ExtractHour
from django.http import HttpResponse
from django.conf import settings
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.generics import ListAPIView

from .models import (
    Monitor,
    MonitorLog,
    Incident,
    StatusPage,
    MaintenanceWindow,
    Application,
    ApiMetric,
    ApiMetricSummary,
)
from .serializers import (
    MonitorSerializer,
    MonitorLogSerializer,
    IncidentSerializer,
    StatusPageSerializer,
    MaintenanceWindowSerializer,
    ApplicationSerializer,
    ApiMetricIngestSerializer,
)
from .tasks import aggregate_apm_metrics, process_apm_metrics


MAX_MONITORS_PER_USER = 10
MAX_APM_APPLICATIONS_PER_USER = 5

def _cache_get(key):
    try:
        return cache.get(key)
    except Exception:
        return None


def _cache_set(key, value, timeout=30):
    try:
        cache.set(key, value, timeout=timeout)
    except Exception:
        pass


def _cache_delete(key):
    try:
        cache.delete(key)
    except Exception:
        pass


class MonitorViewSet(viewsets.ModelViewSet):
    """CRUD viewset for monitors - scoped to the authenticated user."""
    serializer_class = MonitorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Use Subquery annotations to fetch latest log info in a single query,
        # completely avoiding expensive prefetch joins of entire logs tables.
        latest_log = MonitorLog.objects.filter(monitor=OuterRef('pk')).order_by('-checked_at')
        return Monitor.objects.filter(user=self.request.user).annotate(
            latest_is_up=Subquery(latest_log.values('is_up')[:1]),
            latest_checked=Subquery(latest_log.values('checked_at')[:1]),
            latest_response_time=Subquery(latest_log.values('response_time_ms')[:1]),
            latest_status_code=Subquery(latest_log.values('status_code')[:1]),
            latest_status=Subquery(latest_log.values('status')[:1]),
        )

    def _invalidate_analytics_cache(self, user_id):
        """Bust the 30-second analytics cache for a user after any monitor mutation."""
        _cache_delete(f'global_analytics:{user_id}')

    def perform_create(self, serializer):
        if Monitor.objects.filter(user=self.request.user).count() >= MAX_MONITORS_PER_USER:
            raise ValidationError({
                'detail': f'You can create at most {MAX_MONITORS_PER_USER} monitors.'
            })
        serializer.save(user=self.request.user)
        self._invalidate_analytics_cache(self.request.user.id)

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.delete()
        self._invalidate_analytics_cache(user_id)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a monitor (set is_active to False)."""
        monitor = self.get_object()
        monitor.is_active = False
        monitor.save()
        self._invalidate_analytics_cache(request.user.id)
        return Response(MonitorSerializer(monitor).data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a monitor (set is_active to True)."""
        monitor = self.get_object()
        monitor.is_active = True
        monitor.save()
        self._invalidate_analytics_cache(request.user.id)
        return Response(MonitorSerializer(monitor).data)

    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Perform Pause, Resume, or Delete actions on multiple monitors at once."""
        action_type = request.data.get('action')
        monitor_ids = request.data.get('ids', [])

        if not action_type or not monitor_ids:
            return Response({'error': 'action and ids are required fields.'}, status=status.HTTP_400_BAD_REQUEST)

        monitors = Monitor.objects.filter(user=self.request.user, id__in=monitor_ids)

        if action_type == 'pause':
            count = monitors.update(is_active=False)
            self._invalidate_analytics_cache(request.user.id)
            return Response({'message': f'Paused {count} monitors.'})
        elif action_type == 'resume':
            count = monitors.update(is_active=True)
            self._invalidate_analytics_cache(request.user.id)
            return Response({'message': f'Resumed {count} monitors.'})
        elif action_type == 'delete':
            count = monitors.count()
            monitors.delete()
            self._invalidate_analytics_cache(request.user.id)
            return Response({'message': f'Deleted {count} monitors.'})
        else:
            return Response({'error': f'Unknown action: {action_type}'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'])
    def export_csv(self, request, pk=None):
        """Export all logs for a monitor as a CSV file."""
        monitor = self.get_object()
        logs = MonitorLog.objects.filter(monitor=monitor).order_by('-checked_at')

        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="pingbeat_logs_{monitor.id}.csv"'

        writer = csv.writer(response)
        writer.writerow(['Checked At', 'Status', 'Status Code', 'Response Time (ms)', 'Error Message'])

        for log in logs:
            status_str = 'UP' if log.is_up else 'DOWN'
            writer.writerow([
                log.checked_at.strftime('%Y-%m-%d %H:%M:%S UTC'),
                status_str,
                log.status_code if log.status_code else 'N/A',
                log.response_time_ms if log.response_time_ms is not None else 'N/A',
                log.error_message or ''
            ])

        return response

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Return SLA percentages, latency stats, and chart data for a monitor."""
        monitor = self.get_object()
        now = timezone.now()

        def compute_sla(hours):
            """Compute uptime SLA % over the given number of hours."""
            since = now - timedelta(hours=hours)
            logs = MonitorLog.objects.filter(monitor=monitor, checked_at__gte=since)
            total = logs.count()
            if total == 0:
                return None
            up_count = logs.filter(is_up=True).count()
            return round((up_count / total) * 100, 2)

        # SLA percentages
        sla_24h = compute_sla(24)
        sla_7d = compute_sla(24 * 7)
        sla_30d = compute_sla(24 * 30)

        # Latency stats over last 24 hours (only successful checks)
        since_24h = now - timedelta(hours=24)
        latency_logs = MonitorLog.objects.filter(
            monitor=monitor,
            checked_at__gte=since_24h,
            is_up=True,
            response_time_ms__isnull=False
        )
        latency_stats = latency_logs.aggregate(
            avg=Avg('response_time_ms'),
            min=Min('response_time_ms'),
            max=Max('response_time_ms'),
        )

        # Chart data: last 100 checks in the last 24h, oldest first
        chart_logs = MonitorLog.objects.filter(
            monitor=monitor,
            checked_at__gte=since_24h
        ).order_by('checked_at')[:100]

        chart_data = [
            {
                'time': log.checked_at.isoformat(),
                'response_time': log.response_time_ms,
                'is_up': log.is_up,
            }
            for log in chart_logs
        ]

        return Response({
            'sla': {
                '24h': sla_24h,
                '7d': sla_7d,
                '30d': sla_30d,
            },
            'latency': {
                'avg': round(latency_stats['avg'], 2) if latency_stats['avg'] else None,
                'min': round(latency_stats['min'], 2) if latency_stats['min'] else None,
                'max': round(latency_stats['max'], 2) if latency_stats['max'] else None,
            },
            'chart': chart_data,
        })


class MonitorLogListView(ListAPIView):
    """List recent monitor logs for the authenticated user, optionally filtered by monitor_id."""
    serializer_class = MonitorLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MonitorLog.objects.filter(monitor__user=self.request.user)
        monitor_id = self.request.query_params.get('monitor_id')
        if monitor_id:
            qs = qs.filter(monitor_id=monitor_id)
        return qs[:50]


class IncidentViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnly viewset for incidents - scoped to the authenticated user."""
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Incident.objects.filter(monitor__user=self.request.user).order_by('-started_at')


class StatusPageViewSet(viewsets.ModelViewSet):
    """CRUD viewset for status pages configuration."""
    serializer_class = StatusPageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StatusPage.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_status_detail(request, slug):
    """Public unauthenticated status check endpoint for status pages."""
    try:
        status_page = StatusPage.objects.get(slug=slug, is_public=True)
    except StatusPage.DoesNotExist:
        return Response({'error': 'Status page not found.'}, status=status.HTTP_404_NOT_FOUND)

    monitors_data = []
    now = timezone.now()
    since_90d = now - timedelta(days=90)

    for monitor in status_page.monitors.all():
        latest_log = monitor.logs.order_by('-checked_at').only('is_up', 'checked_at').first()
        logs_90d = MonitorLog.objects.filter(monitor=monitor, checked_at__gte=since_90d)
        total_checks = logs_90d.count()
        up_checks = logs_90d.filter(is_up=True).count()
        sla_90d = round((up_checks / total_checks) * 100, 2) if total_checks > 0 else None

        # Build 90-day status matrix
        status_history = []
        for day_offset in range(89, -1, -1):
            day_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=day_offset)
            day_end = day_start + timedelta(days=1)
            day_logs = MonitorLog.objects.filter(monitor=monitor, checked_at__range=(day_start, day_end))
            
            if not day_logs.exists():
                day_status = 'NO_DATA'
            elif day_logs.filter(is_up=False).exists():
                day_status = 'DOWN'
            else:
                day_status = 'UP'

            status_history.append({
                'date': day_start.date().isoformat(),
                'status': day_status
            })

        monitors_data.append({
            'id': monitor.id,
            'name': monitor.name,
            'url': monitor.url,
            'is_active': monitor.is_active,
            'is_up': latest_log.is_up if latest_log else None,
            'last_checked': latest_log.checked_at if latest_log else None,
            'sla_90d': sla_90d,
            'status_history': status_history,
            'ssl_expiry': monitor.ssl_expiry,
            'ssl_issuer': monitor.ssl_issuer,
        })

    active_incidents = Incident.objects.filter(
        monitor__in=status_page.monitors.all(),
        resolved_at__isnull=True
    )
    incidents_data = IncidentSerializer(active_incidents, many=True).data

    return Response({
        'title': status_page.title,
        'monitors': monitors_data,
        'active_incidents': incidents_data,
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def monitor_badge(request, pk):
    """Return a Shields.io styled SVG badge for a monitor's 30-day uptime."""
    try:
        # Allow any user to fetch monitor uptime badges for public sharing
        monitor = Monitor.objects.get(id=pk)
    except Monitor.DoesNotExist:
        return Response({'error': 'Monitor not found.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    since_30d = now - timedelta(days=30)
    logs = MonitorLog.objects.filter(monitor=monitor, checked_at__gte=since_30d)
    total = logs.count()
    if total == 0:
        uptime_pct = 100.0
    else:
        uptime_pct = round((logs.filter(is_up=True).count() / total) * 100, 2)

    if uptime_pct >= 99.0:
        color = '#10b981'  # emerald
    elif uptime_pct >= 95.0:
        color = '#f59e0b'  # amber
    else:
        color = '#ef4444'  # red

    uptime_str = f"{uptime_pct}%"

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="112" height="20">
  <linearGradient id="b" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <mask id="a">
    <rect width="112" height="20" rx="3" fill="#fff"/>
  </mask>
  <g mask="url(#a)">
    <rect width="55" height="20" fill="#555"/>
    <rect x="55" width="57" height="20" fill="{color}"/>
    <rect width="112" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="28.5" y="15" fill="#010101" fill-opacity=".3">uptime</text>
    <text x="28.5" y="14">uptime</text>
    <text x="83.5" y="15" fill="#010101" fill-opacity=".3">{uptime_str}</text>
    <text x="83.5" y="14">{uptime_str}</text>
  </g>
</svg>"""

    return HttpResponse(svg, content_type='image/svg+xml')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def global_analytics(request):
    """Aggregate analytics dashboard metrics across all user monitors."""
    cache_key = f'global_analytics:{request.user.id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    user_monitors = Monitor.objects.filter(user=request.user)
    total_monitors = user_monitors.count()
    if total_monitors == 0:
        payload = {
            'total_monitors': 0,
            'active_monitors': 0,
            'overall_sla': 100.0,
            'avg_response_time': 0,
            'slowest_monitors': [],
            'active_incidents_count': 0,
            'hourly_heatmap': [{'hour': h, 'count': 0} for h in range(24)]
        }
        _cache_set(cache_key, payload, timeout=30)
        return Response(payload)

    now = timezone.now()
    since_7d = now - timedelta(days=7)
    base_qs = MonitorLog.objects.filter(monitor__user=request.user, checked_at__gte=since_7d)

    # Single aggregate call: total checks, up checks, and average latency together
    agg = base_qs.aggregate(
        total_checks=Count('id'),
        up_checks=Count('id', filter=Q(is_up=True)),
        avg_latency=Avg('response_time_ms', filter=Q(is_up=True, response_time_ms__isnull=False)),
    )
    total_checks = agg['total_checks'] or 0
    up_checks = agg['up_checks'] or 0
    overall_sla = round((up_checks / total_checks) * 100, 2) if total_checks > 0 else 100.0
    avg_response_time = round(agg['avg_latency'], 2) if agg['avg_latency'] else 0

    # Monitor counts in one query
    monitor_agg = user_monitors.aggregate(
        active_monitors=Count('id', filter=Q(is_active=True)),
    )
    active_monitors = monitor_agg['active_monitors']

    # Slowest monitors in one grouped query
    monitors_avg_latency = (
        base_qs
        .filter(is_up=True, response_time_ms__isnull=False)
        .values('monitor__id', 'monitor__name')
        .annotate(avg_latency=Avg('response_time_ms'))
        .order_by('-avg_latency')[:5]
    )
    slowest_monitors = [
        {'id': item['monitor__id'], 'name': item['monitor__name'], 'avg_latency': round(item['avg_latency'], 2)}
        for item in monitors_avg_latency
    ]

    active_incidents_count = Incident.objects.filter(
        monitor__user=request.user, resolved_at__isnull=True
    ).count()

    # DB-level hour extraction for the heatmap — avoids loading rows into Python
    heatmap_qs = (
        base_qs
        .filter(is_up=False)
        .annotate(hour=ExtractHour('checked_at'))
        .values('hour')
        .annotate(count=Count('id'))
        .order_by('hour')
    )
    heatmap_lookup = {row['hour']: row['count'] for row in heatmap_qs}
    heatmap_data = [{'hour': h, 'count': heatmap_lookup.get(h, 0)} for h in range(24)]

    payload = {
        'total_monitors': total_monitors,
        'active_monitors': active_monitors,
        'overall_sla': overall_sla,
        'avg_response_time': avg_response_time,
        'slowest_monitors': slowest_monitors,
        'active_incidents_count': active_incidents_count,
        'hourly_heatmap': heatmap_data,
    }
    cache.set(cache_key, payload, timeout=30)
    return Response(payload)


class MaintenanceWindowViewSet(viewsets.ModelViewSet):
    """CRUD ViewSet for maintenance windows."""
    serializer_class = MaintenanceWindowSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = MaintenanceWindow.objects.filter(monitor__user=self.request.user)
        monitor_id = self.request.query_params.get('monitor_id')
        if monitor_id:
            qs = qs.filter(monitor_id=monitor_id)
        return qs


class ApplicationViewSet(viewsets.ModelViewSet):
    """CRUD API for SDK-instrumented applications."""
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user).annotate(
            metrics_count=Count('api_metrics')
        )

    def perform_create(self, serializer):
        if Application.objects.filter(user=self.request.user).count() >= MAX_APM_APPLICATIONS_PER_USER:
            raise ValidationError({
                'detail': f'You can create at most {MAX_APM_APPLICATIONS_PER_USER} API keys.'
            })
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], url_path='rotate-key')
    def rotate_key(self, request, pk=None):
        application = self.get_object()
        application.api_key = Application._meta.get_field('api_key').get_default()
        application.save(update_fields=['api_key'])
        return Response(self.get_serializer(application).data)


@api_view(['POST'])
@permission_classes([AllowAny])
def apm_ingest(request):
    """Receive SDK metric batches, validate the API key, and enqueue processing."""
    body_api_key = request.data.get('api_key', '') if hasattr(request.data, 'get') else ''
    provided_api_key = request.headers.get('X-API-Key') or body_api_key
    rate_limit_key = f'apm_ingest_rate:{provided_api_key or "anonymous"}'
    window_seconds = 60
    max_requests = getattr(settings, 'APM_INGEST_RATE_LIMIT', 60)
    current = cache.get(rate_limit_key, 0)

    if current >= max_requests:
        response = Response({'error': 'Rate limit exceeded.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        response['X-RateLimit-Limit'] = str(max_requests)
        response['X-RateLimit-Remaining'] = '0'
        response['X-RateLimit-Window'] = str(window_seconds)
        return response

    cache.set(rate_limit_key, current + 1, timeout=window_seconds)

    serializer = ApiMetricIngestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    api_key = provided_api_key or serializer.validated_data.get('api_key', '')
    if not api_key:
        return Response({'error': 'API key is required.'}, status=status.HTTP_401_UNAUTHORIZED)

    try:
        application = Application.objects.get(api_key=api_key)
    except Application.DoesNotExist:
        return Response({'error': 'Invalid API key.'}, status=status.HTTP_401_UNAUTHORIZED)

    metrics = []
    for metric in serializer.validated_data['metrics']:
        metrics.append({
            'endpoint': metric['endpoint'],
            'method': metric['method'],
            'status_code': metric['status_code'],
            'response_time_ms': metric['response_time_ms'],
            'timestamp': metric['timestamp'].isoformat(),
            'error_message': metric.get('error_message') or '',
        })

    if getattr(settings, 'PINGBEAT_APM_SYNC_INGEST', False):
        process_apm_metrics(application.id, metrics)
        aggregate_apm_metrics(60)
    else:
        process_apm_metrics.delay(application.id, metrics)

    remaining = max(max_requests - (current + 1), 0)
    response = Response({
        'status': 'accepted',
        'application_id': application.id,
        'queued_metrics': len(metrics),
    }, status=status.HTTP_202_ACCEPTED)
    response['X-RateLimit-Limit'] = str(max_requests)
    response['X-RateLimit-Remaining'] = str(remaining)
    response['X-RateLimit-Window'] = str(window_seconds)
    return response


def _user_apm_summaries(request):
    try:
        hours = int(request.query_params.get('hours', 24))
    except (TypeError, ValueError):
        hours = 24
    since = timezone.now() - timedelta(hours=max(min(hours, 24 * 30), 1))
    queryset = ApiMetricSummary.objects.filter(
        application__user=request.user,
        minute_bucket__gte=since,
    )
    application_id = request.query_params.get('application_id')
    if application_id:
        queryset = queryset.filter(application_id=application_id)
    endpoint = request.query_params.get('endpoint')
    if endpoint:
        queryset = queryset.filter(endpoint=endpoint)
    return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apm_analytics(request):
    """Overview cards for the APM dashboard."""
    try:
        hours = int(request.query_params.get('hours', 24))
    except (TypeError, ValueError):
        hours = 24
    application_id = request.query_params.get('application_id', '')
    cache_key = f'apm_analytics:{request.user.id}:{hours}:{application_id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    summaries = _user_apm_summaries(request)
    rows = list(summaries.values(
        'requests_count', 'avg_response_time', 'error_rate', 'p95_latency', 'p99_latency'
    ))
    total_requests = sum(row['requests_count'] for row in rows)

    if total_requests:
        avg_response_time = sum(
            row['avg_response_time'] * row['requests_count'] for row in rows
        ) / total_requests
        error_rate = sum(
            row['error_rate'] * row['requests_count'] for row in rows
        ) / total_requests
    else:
        avg_response_time = 0
        error_rate = 0

    # Single conditional aggregate for APDEX: replaces 3 separate count queries
    apdex_threshold = 200
    raw_metrics_qs = ApiMetric.objects.filter(
        application__user=request.user,
        timestamp__gte=timezone.now() - timedelta(hours=max(min(hours, 24 * 30), 1)),
    )
    if application_id:
        raw_metrics_qs = raw_metrics_qs.filter(application_id=application_id)
    apdex_agg = raw_metrics_qs.aggregate(
        raw_total=Count('id'),
        satisfied=Count('id', filter=Q(response_time_ms__lte=apdex_threshold)),
        tolerating=Count('id', filter=Q(
            response_time_ms__gt=apdex_threshold,
            response_time_ms__lte=apdex_threshold * 4,
        )),
    )
    raw_total = apdex_agg['raw_total'] or 0
    satisfied = apdex_agg['satisfied'] or 0
    tolerating = apdex_agg['tolerating'] or 0
    apdex_score = round((satisfied + tolerating / 2) / raw_total, 2) if raw_total else None

    payload = {
        'total_requests': total_requests,
        'average_response_time': round(avg_response_time, 2),
        'error_rate': round(error_rate, 2),
        'active_applications': Application.objects.filter(user=request.user).count(),
        'p95_latency': round(max([row['p95_latency'] for row in rows], default=0), 2),
        'p99_latency': round(max([row['p99_latency'] for row in rows], default=0), 2),
        'apdex_score': apdex_score,
        'apdex_threshold_ms': apdex_threshold,
    }
    _cache_set(cache_key, payload, timeout=30)
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apm_endpoints(request):
    """Endpoint-level APM analytics."""
    try:
        hours = int(request.query_params.get('hours', 24))
    except (TypeError, ValueError):
        hours = 24
    application_id = request.query_params.get('application_id', '')
    cache_key = f'apm_endpoints:{request.user.id}:{hours}:{application_id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    data = _user_apm_summaries(request).values('endpoint').annotate(
        requests_count=Sum('requests_count'),
        avg_response_time=Avg('avg_response_time'),
        p95_latency=Max('p95_latency'),
        p99_latency=Max('p99_latency'),
        error_rate=Avg('error_rate'),
    ).order_by('-requests_count')[:25]

    payload = [
        {
            'endpoint': row['endpoint'],
            'requests_count': row['requests_count'],
            'avg_response_time': round(row['avg_response_time'] or 0, 2),
            'p95_latency': round(row['p95_latency'] or 0, 2),
            'p99_latency': round(row['p99_latency'] or 0, 2),
            'error_rate': round(row['error_rate'] or 0, 2),
        }
        for row in data
    ]
    _cache_set(cache_key, payload, timeout=30)
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apm_traffic(request):
    """Minute traffic and latency trend series."""
    try:
        hours = int(request.query_params.get('hours', 24))
    except (TypeError, ValueError):
        hours = 24
    application_id = request.query_params.get('application_id', '')
    cache_key = f'apm_traffic:{request.user.id}:{hours}:{application_id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    data = _user_apm_summaries(request).values('minute_bucket').annotate(
        requests_count=Sum('requests_count'),
        avg_response_time=Avg('avg_response_time'),
        error_rate=Avg('error_rate'),
    ).order_by('minute_bucket')

    payload = [
        {
            'timestamp': row['minute_bucket'].isoformat(),
            'requests_count': row['requests_count'],
            'avg_response_time': round(row['avg_response_time'] or 0, 2),
            'error_rate': round(row['error_rate'] or 0, 2),
        }
        for row in data
    ]
    _cache_set(cache_key, payload, timeout=30)
    return Response(payload)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def apm_errors(request):
    """Raw error breakdown for application detail pages."""
    try:
        hours = int(request.query_params.get('hours', 24))
    except (TypeError, ValueError):
        hours = 24
    since = timezone.now() - timedelta(hours=max(min(hours, 24 * 30), 1))
    metrics = ApiMetric.objects.filter(
        application__user=request.user,
        timestamp__gte=since,
        status_code__gte=400,
    )
    application_id = request.query_params.get('application_id')
    if application_id:
        metrics = metrics.filter(application_id=application_id)

    by_status = metrics.values('status_code').annotate(count=Count('id')).order_by('-count')
    by_endpoint = metrics.values('endpoint').annotate(count=Count('id')).order_by('-count')[:10]
    groups = metrics.values('status_code', 'endpoint').annotate(
        count=Count('id'),
        first_seen=Min('timestamp'),
        last_seen=Max('timestamp'),
    ).order_by('-count')[:50]
    recent = metrics.exclude(error_message__isnull=True).exclude(error_message='').values(
        'status_code', 'endpoint', 'error_message', 'timestamp'
    ).order_by('-timestamp')[:10]

    return Response({
        'total_errors': metrics.count(),
        'by_status_code': list(by_status),
        'top_error_endpoints': list(by_endpoint),
        'error_groups': list(groups),
        'recent_errors': list(recent),
    })