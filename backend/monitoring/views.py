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
from rest_framework.pagination import PageNumberPagination

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


def _invalidate_user_cache(user_id, monitor_id=None, status_page_slug=None):
    """Invalidate all cached views for a specific user to ensure fresh data."""
    keys_to_delete = [
        f'global_analytics:{user_id}',
        f'monitors_list:{user_id}',
        f'incidents_list:{user_id}',
        f'monitor_logs_list:{user_id}:all',
        f'status_pages_list:{user_id}',
        f'maintenance_windows_list:{user_id}:all',
        f'applications_list:{user_id}',
    ]
    if monitor_id:
        keys_to_delete.extend([
            f'monitor_detail:{user_id}:{monitor_id}',
            f'monitor_stats:{monitor_id}',
            f'monitor_logs_list:{user_id}:{monitor_id}',
            f'maintenance_windows_list:{user_id}:{monitor_id}',
        ])
    if status_page_slug:
        keys_to_delete.append(f'public_status:{status_page_slug}')
        
    for key in keys_to_delete:
        _cache_delete(key)




class MonitorViewSet(viewsets.ModelViewSet):
    """CRUD viewset for monitors - scoped to the authenticated user."""
    serializer_class = MonitorSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        latest_log = MonitorLog.objects.filter(monitor=OuterRef('pk')).order_by('-checked_at')
        # cleanup_old_logs() prunes MonitorLog rows older than 30 days by
        # default, so a 35-day window is effectively "full history" in
        # practice. Prefetching it once here lets get_status_changed_at()
        # compute the current status streak in Python from obj.recent_logs
        # instead of issuing 1-2 extra queries per monitor in list responses.
        recent_logs_cutoff = timezone.now() - timedelta(days=35)
        return Monitor.objects.filter(user=self.request.user).annotate(
            latest_is_up=Subquery(latest_log.values('is_up')[:1]),
            latest_checked=Subquery(latest_log.values('checked_at')[:1]),
            latest_response_time=Subquery(latest_log.values('response_time_ms')[:1]),
            latest_status_code=Subquery(latest_log.values('status_code')[:1]),
            latest_status=Subquery(latest_log.values('status')[:1]),
        ).prefetch_related(
            Prefetch(
                'logs',
                queryset=MonitorLog.objects.filter(checked_at__gte=recent_logs_cutoff)
                    .only('id', 'monitor_id', 'is_up', 'checked_at').order_by('-checked_at'),
                to_attr='recent_logs',
            )
        )

    def _invalidate_analytics_cache(self, user_id, monitor_id=None):
        _invalidate_user_cache(user_id, monitor_id=monitor_id)

    def list(self, request, *args, **kwargs):
        cache_key = f'monitors_list:{request.user.id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=15)
        return response

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        cache_key = f'monitor_detail:{request.user.id}:{instance.id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().retrieve(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=15)
        return response

    def perform_create(self, serializer):
        if Monitor.objects.filter(user=self.request.user).count() >= MAX_MONITORS_PER_USER:
            raise ValidationError({
                'detail': f'You can create at most {MAX_MONITORS_PER_USER} monitors.'
            })
        monitor = serializer.save(user=self.request.user)
        self._invalidate_analytics_cache(self.request.user.id, monitor.id)

    def perform_update(self, serializer):
        monitor = serializer.save()
        self._invalidate_analytics_cache(self.request.user.id, monitor.id)

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        monitor_id = instance.id
        instance.delete()
        self._invalidate_analytics_cache(user_id, monitor_id)

    @action(detail=True, methods=['post'])
    def pause(self, request, pk=None):
        """Pause a monitor (set is_active to False)."""
        monitor = self.get_object()
        monitor.is_active = False
        monitor.save()
        self._invalidate_analytics_cache(request.user.id, monitor.id)
        return Response(MonitorSerializer(monitor).data)

    @action(detail=True, methods=['post'])
    def resume(self, request, pk=None):
        """Resume a monitor (set is_active to True)."""
        monitor = self.get_object()
        monitor.is_active = True
        monitor.save()
        self._invalidate_analytics_cache(request.user.id, monitor.id)
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
            for m_id in monitor_ids:
                self._invalidate_analytics_cache(request.user.id, m_id)
            return Response({'message': f'Paused {count} monitors.'})
        elif action_type == 'resume':
            count = monitors.update(is_active=True)
            for m_id in monitor_ids:
                self._invalidate_analytics_cache(request.user.id, m_id)
            return Response({'message': f'Resumed {count} monitors.'})
        elif action_type == 'delete':
            count = monitors.count()
            monitors.delete()
            for m_id in monitor_ids:
                self._invalidate_analytics_cache(request.user.id, m_id)
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

        cache_key = f'monitor_stats:{monitor.id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)

        now = timezone.now()
        since_24h  = now - timedelta(hours=24)
        since_7d   = now - timedelta(days=7)
        since_30d  = now - timedelta(days=30)

        def _sla_agg(since):
            return MonitorLog.objects.filter(
                monitor=monitor, checked_at__gte=since
            ).exclude(status='maintenance').aggregate(
                total=Count('id'),
                up=Count('id', filter=Q(is_up=True)),
                avg=Avg('response_time_ms', filter=Q(is_up=True, response_time_ms__isnull=False)),
                min=Min('response_time_ms', filter=Q(is_up=True, response_time_ms__isnull=False)),
                max=Max('response_time_ms', filter=Q(is_up=True, response_time_ms__isnull=False)),
            )

        agg_24h = _sla_agg(since_24h)
        agg_7d  = _sla_agg(since_7d)
        agg_30d = _sla_agg(since_30d)

        def _sla(agg):
            return round((agg['up'] / agg['total']) * 100, 2) if agg['total'] else None

        chart_logs = (
            MonitorLog.objects
            .filter(monitor=monitor, checked_at__gte=since_24h)
            .only('checked_at', 'response_time_ms', 'is_up')
            .order_by('checked_at')[:100]
        )
        chart_data = [
            {
                'time': log.checked_at.isoformat(),
                'response_time': log.response_time_ms,
                'is_up': log.is_up,
            }
            for log in chart_logs
        ]

        payload = {
            'sla': {
                '24h': _sla(agg_24h),
                '7d':  _sla(agg_7d),
                '30d': _sla(agg_30d),
            },
            'latency': {
                'avg': round(agg_24h['avg'], 2) if agg_24h['avg'] else None,
                'min': round(agg_24h['min'], 2) if agg_24h['min'] else None,
                'max': round(agg_24h['max'], 2) if agg_24h['max'] else None,
            },
            'chart': chart_data,
        }
        _cache_set(cache_key, payload, timeout=30)
        return Response(payload)


class MonitorLogListView(ListAPIView):
    """List recent monitor logs for the authenticated user, optionally filtered by monitor_id."""
    serializer_class = MonitorLogSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # select_related('monitor') avoids a per-row JOIN on serialization
        qs = MonitorLog.objects.filter(
            monitor__user=self.request.user
        ).select_related('monitor')
        monitor_id = self.request.query_params.get('monitor_id')
        if monitor_id:
            qs = qs.filter(monitor_id=monitor_id)
        return qs[:50]

    def list(self, request, *args, **kwargs):
        monitor_id = request.query_params.get('monitor_id', 'all')
        cache_key = f'monitor_logs_list:{request.user.id}:{monitor_id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=15)
        return response


class IncidentPagination(PageNumberPagination):
    page_size = 50
    max_page_size = 200


class IncidentViewSet(viewsets.ReadOnlyModelViewSet):
    """ReadOnly viewset for incidents - scoped to the authenticated user."""
    serializer_class = IncidentSerializer
    permission_classes = [IsAuthenticated]
    # This list has no upper bound otherwise - a long-lived flaky monitor
    # would return (and cache in Redis) every incident ever recorded.
    pagination_class = IncidentPagination

    def get_queryset(self):
        # select_related('monitor') avoids a per-row query for monitor_name on serialization
        return Incident.objects.filter(
            monitor__user=self.request.user
        ).select_related('monitor').order_by('-started_at')

    def list(self, request, *args, **kwargs):
        cache_key = f'incidents_list:{request.user.id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=15)
        return response


class StatusPageViewSet(viewsets.ModelViewSet):
    """CRUD viewset for status pages configuration."""
    serializer_class = StatusPageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return StatusPage.objects.filter(user=self.request.user)

    def list(self, request, *args, **kwargs):
        cache_key = f'status_pages_list:{request.user.id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=30)
        return response

    def perform_create(self, serializer):
        status_page = serializer.save(user=self.request.user)
        _invalidate_user_cache(self.request.user.id, status_page_slug=status_page.slug)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_slug = instance.slug
        status_page = serializer.save()
        _invalidate_user_cache(self.request.user.id, status_page_slug=old_slug)
        if status_page.slug != old_slug:
            _invalidate_user_cache(self.request.user.id, status_page_slug=status_page.slug)

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        slug = instance.slug
        instance.delete()
        _invalidate_user_cache(user_id, status_page_slug=slug)


@api_view(['GET'])
@permission_classes([AllowAny])
def public_status_detail(request, slug):
    """Public unauthenticated status check endpoint for status pages."""
    cache_key = f'public_status:{slug}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    try:
        status_page = StatusPage.objects.select_related('user').prefetch_related('monitors').get(
            slug=slug, is_public=True
        )
    except StatusPage.DoesNotExist:
        return Response({'error': 'Status page not found.'}, status=status.HTTP_404_NOT_FOUND)

    monitors = list(status_page.monitors.all())
    now = timezone.now()
    since_90d = now - timedelta(days=90)
    day_start_base = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # --- Single query: latest log per monitor via Subquery ---
    latest_log_sub = MonitorLog.objects.filter(
        monitor=OuterRef('pk')
    ).order_by('-checked_at').values('is_up', 'checked_at')[:1]

    # --- Single query: SLA over 90 days for all monitors at once ---
    sla_qs = (
        MonitorLog.objects
        .filter(monitor__in=monitors, checked_at__gte=since_90d)
        .exclude(status='maintenance')
        .values('monitor_id')
        .annotate(
            total=Count('id'),
            up=Count('id', filter=Q(is_up=True)),
        )
    )
    sla_map = {row['monitor_id']: row for row in sla_qs}

    from django.db.models.functions import TruncDate
    daily_qs = (
        MonitorLog.objects
        .filter(monitor__in=monitors, checked_at__gte=since_90d)
        .exclude(status='maintenance')
        .annotate(day=TruncDate('checked_at'))
        .values('monitor_id', 'day')
        .annotate(
            has_down=Count('id', filter=Q(is_up=False)),
            has_up=Count('id', filter=Q(is_up=True)),
        )
    )
    daily_map = {}
    for row in daily_qs:
        mid = row['monitor_id']
        day_str = row['day'].isoformat()
        daily_map.setdefault(mid, {})
        daily_map[mid][day_str] = 'DOWN' if row['has_down'] else 'UP'

    latest_logs_qs = (
        MonitorLog.objects
        .filter(monitor__in=monitors)
        .order_by('monitor_id', '-checked_at')
        .distinct('monitor_id')
        .only('monitor_id', 'is_up', 'checked_at')
    )
    latest_log_map = {log.monitor_id: log for log in latest_logs_qs}

    monitors_data = []
    for monitor in monitors:
        sla_row = sla_map.get(monitor.id)
        sla_90d = round((sla_row['up'] / sla_row['total']) * 100, 2) if sla_row and sla_row['total'] else None
        latest_log = latest_log_map.get(monitor.id)
        monitor_days = daily_map.get(monitor.id, {})

        status_history = []
        for day_offset in range(89, -1, -1):
            day = (day_start_base - timedelta(days=day_offset)).date()
            day_str = day.isoformat()
            status_history.append({
                'date': day_str,
                'status': monitor_days.get(day_str, 'NO_DATA'),
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
        monitor__in=monitors, resolved_at__isnull=True
    ).select_related('monitor')
    incidents_data = IncidentSerializer(active_incidents, many=True).data

    payload = {
        'title': status_page.title,
        'monitors': monitors_data,
        'active_incidents': incidents_data,
    }
    _cache_set(cache_key, payload, timeout=60)
    return Response(payload)


@api_view(['GET'])
@permission_classes([AllowAny])
def monitor_badge(request, pk):
    # Only serve badges for monitors the owner has explicitly published on a
    # public status page - otherwise anyone could enumerate sequential
    # monitor ids to learn which URLs other users monitor. .distinct() avoids
    # MultipleObjectsReturned when a monitor is on more than one public page.
    monitor = Monitor.objects.filter(id=pk, status_pages__is_public=True).distinct().first()
    if monitor is None:
        return Response({'error': 'Monitor not found.'}, status=status.HTTP_404_NOT_FOUND)

    now = timezone.now()
    since_30d = now - timedelta(days=30)
    logs = MonitorLog.objects.filter(monitor=monitor, checked_at__gte=since_30d).exclude(status='maintenance')
    total = logs.count()
    if total == 0:
        uptime_pct = 100.0
    else:
        uptime_pct = round((logs.filter(is_up=True).count() / total) * 100, 2)

    if uptime_pct >= 99.0:
        color = '#10b981'  
    elif uptime_pct >= 95.0:
        color = '#f59e0b'  
    else:
        color = '#ef4444'  

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
    base_qs = MonitorLog.objects.filter(monitor__user=request.user, checked_at__gte=since_7d).exclude(status='maintenance')

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
        # select_related('monitor') avoids a per-row query for monitor_name on serialization
        qs = MaintenanceWindow.objects.filter(monitor__user=self.request.user).select_related('monitor')
        monitor_id = self.request.query_params.get('monitor_id')
        if monitor_id:
            qs = qs.filter(monitor_id=monitor_id)
        return qs

    def list(self, request, *args, **kwargs):
        monitor_id = request.query_params.get('monitor_id', 'all')
        cache_key = f'maintenance_windows_list:{request.user.id}:{monitor_id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=30)
        return response

    def perform_create(self, serializer):
        mw = serializer.save()
        _invalidate_user_cache(self.request.user.id, monitor_id=mw.monitor.id)

    def perform_update(self, serializer):
        instance = self.get_object()
        old_monitor_id = instance.monitor.id
        mw = serializer.save()
        _invalidate_user_cache(self.request.user.id, monitor_id=old_monitor_id)
        if mw.monitor.id != old_monitor_id:
            _invalidate_user_cache(self.request.user.id, monitor_id=mw.monitor.id)

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        monitor_id = instance.monitor.id
        instance.delete()
        _invalidate_user_cache(user_id, monitor_id=monitor_id)


class ApplicationViewSet(viewsets.ModelViewSet):
    """CRUD API for SDK-instrumented applications."""
    serializer_class = ApplicationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Application.objects.filter(user=self.request.user).annotate(
            metrics_count=Count('api_metrics')
        )

    def list(self, request, *args, **kwargs):
        cache_key = f'applications_list:{request.user.id}'
        cached = _cache_get(cache_key)
        if cached is not None:
            return Response(cached)
        response = super().list(request, *args, **kwargs)
        _cache_set(cache_key, response.data, timeout=30)
        return response

    def perform_create(self, serializer):
        if Application.objects.filter(user=self.request.user).count() >= MAX_APM_APPLICATIONS_PER_USER:
            raise ValidationError({
                'detail': f'You can create at most {MAX_APM_APPLICATIONS_PER_USER} API keys.'
            })
        serializer.save(user=self.request.user)
        _invalidate_user_cache(self.request.user.id)

    def perform_update(self, serializer):
        serializer.save()
        _invalidate_user_cache(self.request.user.id)

    def perform_destroy(self, instance):
        user_id = self.request.user.id
        instance.delete()
        _invalidate_user_cache(user_id)

    @action(detail=True, methods=['post'], url_path='rotate-key')
    def rotate_key(self, request, pk=None):
        application = self.get_object()
        application.api_key = Application._meta.get_field('api_key').get_default()
        application.save(update_fields=['api_key'])
        _invalidate_user_cache(request.user.id)
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
    # cache.add + cache.incr (atomic INCR on the Redis backend) instead of a
    # get-then-set pair, so concurrent requests for the same key can't both
    # read the same pre-increment count and both proceed past the check.
    cache.add(rate_limit_key, 0, timeout=window_seconds)
    try:
        current = cache.incr(rate_limit_key)
    except ValueError:
        # Key expired between add() and incr() - reinitialize the window.
        cache.set(rate_limit_key, 1, timeout=window_seconds)
        current = 1

    if current > max_requests:
        response = Response({'error': 'Rate limit exceeded.'}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        response['X-RateLimit-Limit'] = str(max_requests)
        response['X-RateLimit-Remaining'] = '0'
        response['X-RateLimit-Window'] = str(window_seconds)
        return response

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
    application_id = request.query_params.get('application_id', '')
    cache_key = f'apm_errors:{request.user.id}:{hours}:{application_id}'
    cached = _cache_get(cache_key)
    if cached is not None:
        return Response(cached)

    since = timezone.now() - timedelta(hours=max(min(hours, 24 * 30), 1))
    metrics = ApiMetric.objects.filter(
        application__user=request.user,
        timestamp__gte=since,
        status_code__gte=400,
    )
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

    by_status_list = list(by_status)
    # Derive total_errors from already-fetched data instead of an extra COUNT(*) query
    total_errors = sum(row['count'] for row in by_status_list)

    payload = {
        'total_errors': total_errors,
        'by_status_code': by_status_list,
        'top_error_endpoints': list(by_endpoint),
        'error_groups': list(groups),
        'recent_errors': list(recent),
    }
    _cache_set(cache_key, payload, timeout=30)
    return Response(payload)