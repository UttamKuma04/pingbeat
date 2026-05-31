from django.contrib import admin
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


@admin.register(Monitor)
class MonitorAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'is_active', 'user', 'created_at')
    list_filter = ('is_active',)


@admin.register(MonitorLog)
class MonitorLogAdmin(admin.ModelAdmin):
    list_display = ('monitor', 'is_up', 'status_code', 'response_time_ms', 'checked_at')
    list_filter = ('is_up',)


@admin.register(Incident)
class IncidentAdmin(admin.ModelAdmin):
    list_display = ('monitor', 'started_at', 'resolved_at', 'duration_seconds')
    list_filter = ('resolved_at',)


@admin.register(StatusPage)
class StatusPageAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'user', 'is_public', 'created_at')
    prepopulated_fields = {'slug': ('title',)}


@admin.register(MaintenanceWindow)
class MaintenanceWindowAdmin(admin.ModelAdmin):
    list_display = ('monitor', 'label', 'start_time', 'end_time', 'created_at')
    list_filter = ('start_time', 'end_time')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('name', 'environment', 'user', 'created_at')
    search_fields = ('name', 'environment', 'user__username')
    readonly_fields = ('api_key', 'created_at')


@admin.register(ApiMetric)
class ApiMetricAdmin(admin.ModelAdmin):
    list_display = ('application', 'method', 'endpoint', 'status_code', 'response_time_ms', 'timestamp')
    list_filter = ('method', 'status_code', 'timestamp')
    search_fields = ('application__name', 'endpoint')


@admin.register(ApiMetricSummary)
class ApiMetricSummaryAdmin(admin.ModelAdmin):
    list_display = (
        'application', 'endpoint', 'requests_count', 'avg_response_time',
        'p95_latency', 'p99_latency', 'error_rate', 'minute_bucket'
    )
    list_filter = ('minute_bucket',)
    search_fields = ('application__name', 'endpoint')
