from rest_framework import serializers
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


class MonitorLogSerializer(serializers.ModelSerializer):
    """Serializer for monitor log entries."""
    class Meta:
        model = MonitorLog
        fields = ('id', 'monitor', 'status_code', 'response_time_ms', 'is_up', 'error_message', 'checked_at',
                  'region', 'ssl_expiry_date', 'ssl_days_remaining', 'ssl_warning', 'failure_reason', 'status')
        read_only_fields = fields


class MonitorSerializer(serializers.ModelSerializer):
    """Serializer for monitors with computed status fields and advanced config options."""
    is_up = serializers.SerializerMethodField()
    last_checked = serializers.SerializerMethodField()
    last_response_time = serializers.SerializerMethodField()
    last_status_code = serializers.SerializerMethodField()
    status_changed_at = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()
    assert_status_code = serializers.IntegerField(source='expected_status', required=False)

    class Meta:
        model = Monitor
        fields = (
            'id', 'name', 'url', 'expected_status', 'interval_seconds', 'timeout_seconds',
            'is_active', 'email_alerts', 'is_up', 'last_checked', 'last_response_time',
            'last_status_code', 'status_changed_at', 'created_at',
            'http_method', 'headers', 'body', 'keyword', 'webhook_url',
            'notification_channel', 'tags', 'ssl_expiry', 'ssl_issuer',
            'assert_keyword', 'assert_max_response_time_ms', 'assert_status_code', 'current_status'
        )
        read_only_fields = (
            'id', 'is_up', 'last_checked', 'last_response_time', 'last_status_code',
            'status_changed_at', 'created_at', 'ssl_expiry', 'ssl_issuer', 'current_status'
        )

    def _get_prefetched_logs(self, obj):
        if hasattr(obj, 'prefetched_logs'):
            return obj.prefetched_logs
        if not hasattr(obj, '_cached_logs_db'):
            obj._cached_logs_db = list(obj.logs.order_by('-checked_at')[:100])
        return obj._cached_logs_db

    def get_is_up(self, obj):
        logs = self._get_prefetched_logs(obj)
        return logs[0].is_up if logs else None

    def get_last_checked(self, obj):
        logs = self._get_prefetched_logs(obj)
        return logs[0].checked_at if logs else None

    def get_last_response_time(self, obj):
        logs = self._get_prefetched_logs(obj)
        return logs[0].response_time_ms if logs else None

    def get_last_status_code(self, obj):
        logs = self._get_prefetched_logs(obj)
        return logs[0].status_code if logs else None

    def get_status_changed_at(self, obj):
        logs = self._get_prefetched_logs(obj)
        if not logs:
            return obj.created_at
        
        current_status = logs[0].is_up
        last_consecutive_log = logs[0]
        for log in logs[1:]:
            if log.is_up != current_status:
                break
            last_consecutive_log = log
            
        return last_consecutive_log.checked_at

    def get_current_status(self, obj):
        if not obj.is_active:
            return 'paused'
        logs = self._get_prefetched_logs(obj)
        if logs:
            return logs[0].status
        return 'unknown'


class IncidentSerializer(serializers.ModelSerializer):
    """Serializer for monitor downtime incidents."""
    monitor_name = serializers.CharField(source='monitor.name', read_only=True)

    class Meta:
        model = Incident
        fields = ('id', 'monitor', 'monitor_name', 'started_at', 'resolved_at', 'duration_seconds', 'error_message')
        read_only_fields = ('id', 'started_at', 'resolved_at', 'duration_seconds')


class StatusPageSerializer(serializers.ModelSerializer):
    """Serializer for public status pages."""
    class Meta:
        model = StatusPage
        fields = ('id', 'title', 'slug', 'is_public', 'monitors', 'created_at')
        read_only_fields = ('id', 'user', 'created_at')


class MaintenanceWindowSerializer(serializers.ModelSerializer):
    """Serializer for maintenance windows."""
    monitor_name = serializers.CharField(source='monitor.name', read_only=True)

    class Meta:
        model = MaintenanceWindow
        fields = ('id', 'monitor', 'monitor_name', 'start_time', 'end_time', 'label', 'created_at')
        read_only_fields = ('id', 'created_at')


class ApplicationSerializer(serializers.ModelSerializer):
    """Serializer for SDK-instrumented applications."""
    metrics_count = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ('id', 'name', 'environment', 'api_key', 'created_at', 'metrics_count')
        read_only_fields = ('id', 'api_key', 'created_at', 'metrics_count')

    def get_metrics_count(self, obj):
        return getattr(obj, 'metrics_count', 0)


class ApiMetricSerializer(serializers.ModelSerializer):
    """Serializer for raw API metrics."""
    application_name = serializers.CharField(source='application.name', read_only=True)

    class Meta:
        model = ApiMetric
        fields = (
            'id', 'application', 'application_name', 'endpoint', 'method',
            'status_code', 'response_time_ms', 'timestamp', 'error_message'
        )
        read_only_fields = fields


class ApiMetricSummarySerializer(serializers.ModelSerializer):
    """Serializer for minute-level API metric summaries."""
    class Meta:
        model = ApiMetricSummary
        fields = (
            'id', 'application', 'endpoint', 'requests_count', 'avg_response_time',
            'p95_latency', 'p99_latency', 'error_rate', 'minute_bucket'
        )
        read_only_fields = fields


class ApiMetricIngestItemSerializer(serializers.Serializer):
    """Validate one SDK metric inside a batch."""
    endpoint = serializers.CharField(max_length=512)
    method = serializers.CharField(max_length=10)
    status_code = serializers.IntegerField(min_value=100, max_value=599)
    response_time_ms = serializers.FloatField(min_value=0)
    timestamp = serializers.DateTimeField()
    error_message = serializers.CharField(max_length=2000, required=False, allow_null=True, allow_blank=True)

    def validate_method(self, value):
        return value.upper()


class ApiMetricIngestSerializer(serializers.Serializer):
    """Validate one SDK batch."""
    api_key = serializers.CharField(max_length=80, required=False, allow_blank=True)
    metrics = ApiMetricIngestItemSerializer(many=True)

    def validate_metrics(self, value):
        if not value:
            raise serializers.ValidationError('At least one metric is required.')
        if len(value) > 1000:
            raise serializers.ValidationError('A batch can contain at most 1000 metrics.')
        return value
