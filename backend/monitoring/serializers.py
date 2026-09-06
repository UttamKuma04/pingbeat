from rest_framework import serializers
from .models import (
    Monitor,
    MonitorLog,
    Incident,
    StatusPage,
    MaintenanceWindow,
    Application,
)

class MonitorLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonitorLog
        fields = ('id', 'monitor', 'status_code', 'response_time_ms', 'is_up', 'error_message', 'checked_at',
                  'region', 'ssl_expiry_date', 'ssl_days_remaining', 'ssl_warning', 'failure_reason', 'status')
        read_only_fields = fields


class MonitorSerializer(serializers.ModelSerializer):
    is_up = serializers.SerializerMethodField()
    last_checked = serializers.SerializerMethodField()
    last_response_time = serializers.SerializerMethodField()
    last_status_code = serializers.SerializerMethodField()
    status_changed_at = serializers.SerializerMethodField()
    current_status = serializers.SerializerMethodField()

    class Meta:
        model = Monitor
        fields = (
            'id', 'name', 'url', 'expected_status', 'interval_seconds', 'timeout_seconds',
            'is_active', 'email_alerts', 'is_up', 'last_checked', 'last_response_time',
            'last_status_code', 'status_changed_at', 'created_at',
            'http_method', 'headers', 'body', 'keyword', 'webhook_url',
            'notification_channel', 'tags', 'ssl_expiry', 'ssl_issuer',
            'assert_keyword', 'assert_max_response_time_ms', 'current_status'
        )
        read_only_fields = (
            'id', 'is_up', 'last_checked', 'last_response_time', 'last_status_code',
            'status_changed_at', 'created_at', 'ssl_expiry', 'ssl_issuer', 'current_status'
        )

    def get_is_up(self, obj):
        if hasattr(obj, 'latest_is_up'):
            return obj.latest_is_up
        log = obj.logs.first()
        return log.is_up if log else None

    def get_last_checked(self, obj):
        if hasattr(obj, 'latest_checked'):
            return obj.latest_checked
        log = obj.logs.first()
        return log.checked_at if log else None

    def get_last_response_time(self, obj):
        if hasattr(obj, 'latest_response_time'):
            return obj.latest_response_time
        log = obj.logs.first()
        return log.response_time_ms if log else None

    def get_last_status_code(self, obj):
        if hasattr(obj, 'latest_status_code'):
            return obj.latest_status_code
        log = obj.logs.first()
        return log.status_code if log else None

    def get_status_changed_at(self, obj):
        recent_logs = getattr(obj, 'recent_logs', None)
        if recent_logs is not None:
            return self._status_changed_at_from_logs(obj, recent_logs)

        # Fallback path (e.g. a Monitor fetched outside get_queryset()'s
        # prefetch) - same logic, executed as direct queries.
        latest_is_up = getattr(obj, 'latest_is_up', None)
        if latest_is_up is None:
            log = obj.logs.only('is_up', 'checked_at').first()
            if not log:
                return obj.created_at
            latest_is_up = log.is_up

        last_diff_log = (
            obj.logs
            .only('checked_at', 'is_up')
            .filter(is_up=not latest_is_up)
            .first()  # already ordered by -checked_at on the model Meta
        )
        if not last_diff_log:
            first_log = obj.logs.only('checked_at').order_by('checked_at').first()
            return first_log.checked_at if first_log else obj.created_at

        transition_log = (
            obj.logs
            .only('checked_at')
            .filter(is_up=latest_is_up, checked_at__gt=last_diff_log.checked_at)
            .order_by('checked_at')
            .first()
        )
        return transition_log.checked_at if transition_log else last_diff_log.checked_at

    @staticmethod
    def _status_changed_at_from_logs(obj, recent_logs):
        """Same logic as the query-based fallback, computed in Python from an
        already-fetched, -checked_at-descending list of recent logs."""
        latest_is_up = getattr(obj, 'latest_is_up', None)
        if latest_is_up is None:
            if not recent_logs:
                return obj.created_at
            latest_is_up = recent_logs[0].is_up

        last_diff_log = next((log for log in recent_logs if log.is_up != latest_is_up), None)
        if not last_diff_log:
            return recent_logs[-1].checked_at if recent_logs else obj.created_at

        transition_log = None
        for log in reversed(recent_logs):  # ascending order
            if log.is_up == latest_is_up and log.checked_at > last_diff_log.checked_at:
                transition_log = log
                break
        return transition_log.checked_at if transition_log else last_diff_log.checked_at

    def get_current_status(self, obj):
        if not obj.is_active:
            return 'paused'
        if hasattr(obj, 'latest_status'):
            return obj.latest_status or 'unknown'
        log = obj.logs.first()
        if log:
            return log.status
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
    monitor_name = serializers.CharField(source='monitor.name', read_only=True)

    class Meta:
        model = MaintenanceWindow
        fields = ('id', 'monitor', 'monitor_name', 'start_time', 'end_time', 'label', 'created_at')
        read_only_fields = ('id', 'created_at')


class ApplicationSerializer(serializers.ModelSerializer):
    metrics_count = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = ('id', 'name', 'environment', 'api_key', 'created_at', 'metrics_count')
        read_only_fields = ('id', 'api_key', 'created_at', 'metrics_count')

    def get_metrics_count(self, obj):
        return getattr(obj, 'metrics_count', 0)


class ApiMetricIngestItemSerializer(serializers.Serializer):
    endpoint = serializers.CharField(max_length=512)
    method = serializers.CharField(max_length=10)
    status_code = serializers.IntegerField(min_value=100, max_value=599)
    response_time_ms = serializers.FloatField(min_value=0)
    timestamp = serializers.DateTimeField()
    error_message = serializers.CharField(max_length=2000, required=False, allow_null=True, allow_blank=True)

    def validate_method(self, value):
        return value.upper()


class ApiMetricIngestSerializer(serializers.Serializer):
    api_key = serializers.CharField(max_length=80, required=False, allow_blank=True)
    metrics = ApiMetricIngestItemSerializer(many=True)

    def validate_metrics(self, value):
        if not value:
            raise serializers.ValidationError('At least one metric is required.')
        if len(value) > 1000:
            raise serializers.ValidationError('A batch can contain at most 1000 metrics.')
        return value
