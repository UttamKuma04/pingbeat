import os
import time
import ssl
import socket
import urllib.parse
import math
from collections import defaultdict
from datetime import datetime, timedelta, timezone as datetime_timezone
import requests as http_requests
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.utils.timezone import make_aware
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings
from celery import shared_task
from .models import Monitor, MonitorLog, Incident, MaintenanceWindow, ApiMetric, ApiMetricSummary


TASK_LOCK_TTL_SECONDS = 300


def _task_lock_key(task_name):
    return f'celery-lock:{task_name}'


def _acquire_task_lock(task_name, timeout=TASK_LOCK_TTL_SECONDS):
    return cache.add(_task_lock_key(task_name), '1', timeout=timeout)


def _release_task_lock(task_name):
    cache.delete(_task_lock_key(task_name))


def percentile(values, percentile_rank):
    if not values:
        return 0
    sorted_values = sorted(values)
    index = max(math.ceil((percentile_rank / 100) * len(sorted_values)) - 1, 0)
    return sorted_values[index]


def check_ssl_expiry(url_str):
    try:
        parsed = urllib.parse.urlparse(url_str)
        if parsed.scheme != 'https':
            return None, None
        
        hostname = parsed.hostname
        if not hostname:
            return None, None
        
        if ':' in hostname:
            hostname = hostname.split(':')[0]

        context = ssl.create_default_context()
        # Set a low socket timeout to avoid hanging the celery task
        with socket.create_connection((hostname, 443), timeout=5) as sock:
            with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                if cert:
                    expire_str = cert.get('notAfter')
                    issuer = dict(x[0] for x in cert.get('issuer', []))
                    issuer_name = issuer.get('commonName') or issuer.get('organizationName') or 'Unknown'
                    if expire_str:
                        try:
                            # Try parsing format: "May 29 12:00:00 2026 GMT"
                            expiry_dt = datetime.strptime(expire_str, '%b %d %H:%M:%S %Y %Z')
                        except ValueError:
                            # Try format without timezone abbreviation
                            expiry_dt = datetime.strptime(expire_str[:-4].strip(), '%b %d %H:%M:%S %Y')
                        
                        # Make timezone aware (UTC)
                        expiry_dt = make_aware(expiry_dt, datetime_timezone.utc)
                        return expiry_dt, issuer_name
    except Exception as e:
        print(f"SSL certificate check failed for {url_str}: {e}")
    return None, None


@shared_task(bind=True, max_retries=5, default_retry_delay=15)
def check_monitors(self):
    task_name = 'check_monitors'
    if not _acquire_task_lock(task_name):
        return f'{task_name} already running'

    try:
        monitors = Monitor.objects.filter(is_active=True)
        results = []
        now = timezone.now()
        probe_region = os.environ.get("PROBE_REGION", "us-east")

        for monitor in monitors:
            previous_log = monitor.logs.first()
            previous_is_up = previous_log.is_up if previous_log else None

            if previous_log:
                elapsed = (now - previous_log.checked_at).total_seconds()
                if elapsed < (monitor.interval_seconds - 5):
                    continue

            active_mw = monitor.maintenance_windows.filter(start_time__lte=now, end_time__gte=now).first()
            if active_mw:
                MonitorLog.objects.create(
                    monitor=monitor,
                    is_up=True,
                    status='maintenance',
                    error_message=f"Skipped check due to active maintenance window: {active_mw.label}",
                    region=probe_region,
                )
                results.append(f'{monitor.name}: SKIPPED (Maintenance)')
                continue

            ssl_expiry_date = None
            ssl_days_remaining = None
            ssl_warning = False
            ssl_expiry = None
            ssl_issuer = None
            if monitor.url.startswith('https://'):
                ssl_expiry, ssl_issuer = check_ssl_expiry(monitor.url)
                if ssl_expiry:
                    ssl_expiry_date = ssl_expiry.date()
                    ssl_days_remaining = (ssl_expiry - now).days
                    ssl_warning = ssl_days_remaining < 14
                    monitor.ssl_expiry = ssl_expiry
                    monitor.ssl_issuer = ssl_issuer
                    monitor.save(update_fields=['ssl_expiry', 'ssl_issuer'])

            start_time = time.time()
            is_up = False
            status_code = None
            error_message = ''
            failure_reason = None

            try:
                req_headers = {'User-Agent': 'PingBEAT Monitor/1.0'}
                if monitor.headers:
                    req_headers.update(monitor.headers)
                req_body = monitor.body if monitor.body else None

                response = http_requests.request(
                    method=monitor.http_method,
                    url=monitor.url,
                    headers=req_headers,
                    data=req_body,
                    timeout=monitor.timeout_seconds,
                )
                response_time_ms = (time.time() - start_time) * 1000
                status_code = response.status_code
                is_up = status_code == monitor.expected_status

                if not is_up:
                    failure_reason = f"Status code assertion failed: expected {monitor.expected_status}, got {status_code}"
                    error_message = failure_reason

                keyword_to_check = monitor.assert_keyword or monitor.keyword
                if is_up and keyword_to_check and keyword_to_check not in response.text:
                    is_up = False
                    failure_reason = f"Keyword assertion failed: '{keyword_to_check}' not found in response body"
                    error_message = failure_reason

                if is_up and monitor.assert_max_response_time_ms is not None and response_time_ms > monitor.assert_max_response_time_ms:
                    is_up = False
                    failure_reason = f"Response time assertion failed: took {response_time_ms:.1f}ms, max allowed {monitor.assert_max_response_time_ms}ms"
                    error_message = failure_reason
            except http_requests.RequestException as exc:
                response_time_ms = (time.time() - start_time) * 1000
                is_up = False
                error_message = str(exc)[:500]
                failure_reason = error_message

            MonitorLog.objects.create(
                monitor=monitor,
                status_code=status_code,
                response_time_ms=round(response_time_ms, 2) if response_time_ms is not None else None,
                is_up=is_up,
                error_message=error_message or '',
                region=probe_region,
                ssl_expiry_date=ssl_expiry_date,
                ssl_days_remaining=ssl_days_remaining,
                ssl_warning=ssl_warning,
                failure_reason=failure_reason,
                status='up' if is_up else 'down'
            )
            results.append(f'{monitor.name}: {"UP" if is_up else "DOWN"}')

            is_transition = previous_is_up is not None and previous_is_up != is_up
            is_initial = previous_is_up is None

            if is_up:
                if is_transition:
                    active_incidents = monitor.incidents.filter(resolved_at__isnull=True)
                    for incident in active_incidents:
                        incident.resolved_at = now
                        incident.duration_seconds = int((now - incident.started_at).total_seconds())
                        incident.save()
            else:
                if is_transition or (is_initial and not is_up):
                    if not monitor.incidents.filter(resolved_at__isnull=True).exists():
                        Incident.objects.create(
                            monitor=monitor,
                            started_at=now,
                            error_message=error_message,
                        )

            if monitor.email_alerts or monitor.webhook_url:
                if is_transition or is_initial:
                    send_monitor_alert.delay(monitor.id, previous_is_up, is_up, error_message)

        return results
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        _release_task_lock(task_name)

@shared_task
def send_monitor_alert(monitor_id, previous_is_up, is_up, error_message=''):
    """Send alert via configured channel (email, Discord, Slack, custom webhook)."""
    try:
        monitor = Monitor.objects.get(id=monitor_id)
        user = monitor.user

        status_text = "UP" if is_up else "DOWN"
        event_label = "Status Change Transition" if previous_is_up is not None else "Initial Status Check"
        
        if previous_is_up is None:
            status_text = "UP (Initial Check)" if is_up else "DOWN (Initial Outage)"

        subject = f"{status_text.upper()} {monitor.name} is {status_text.split(' ')[0]}"
        
        # Plain text fallback
        body_text = (
            f"Hello {user.username},\n\n"
            f"Your service monitor '{monitor.name}' status update:\n\n"
            f"• URL: {monitor.url}\n"
            f"• Event: {event_label}\n"
            f"• Current Status: {status_text}\n"
            f"• Details: {error_message or 'No issues'}\n"
            f"• Checked Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
            f"Best regards,\n"
            f"The PingBEAT Team"
        )

        # HTML Email Template Setup
        html_template = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PingBEAT Alert</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:30px 0;">
        <tr>
            <td align="center">

                <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
                    
                    <tr>
                        <td style="padding:30px;text-align:center;border-bottom:1px solid #e5e7eb;">
                            <img src="https://www.pingbeat.in/logo.svg"
                                 alt="PingBEAT"
                                 height="42">
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:35px 40px;">
                            <h2 style="margin:0 0 20px;color:#111827;font-size:24px;font-weight:600;">
                                Service Down Detected
                            </h2>

                            <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:24px;">
                                PingBEAT has detected that one of your monitored services is currently unavailable.
                            </p>

                            <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                <tr>
                                    <td style="padding:12px 0;color:#6b7280;font-size:14px;width:140px;">
                                        Monitor
                                    </td>
                                    <td style="padding:12px 0;color:#111827;font-size:14px;font-weight:600;">
                                        {{monitor_name}}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px 0;color:#6b7280;font-size:14px;">
                                        URL
                                    </td>
                                    <td style="padding:12px 0;color:#111827;font-size:14px;">
                                        {{monitor_url}}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px 0;color:#6b7280;font-size:14px;">
                                        Status
                                    </td>
                                    <td style="padding:12px 0;">
                                        <span style="display:inline-block;background:#fee2e2;color:#b91c1c;padding:6px 12px;border-radius:20px;font-size:12px;font-weight:600;">
                                            DOWN
                                        </span>
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px 0;color:#6b7280;font-size:14px;">
                                        Detected At
                                    </td>
                                    <td style="padding:12px 0;color:#111827;font-size:14px;">
                                        {{timestamp}}
                                    </td>
                                </tr>

                                <tr>
                                    <td style="padding:12px 0;color:#6b7280;font-size:14px;vertical-align:top;">
                                        Reason
                                    </td>
                                    <td style="padding:12px 0;color:#111827;font-size:14px;">
                                        {{error_message}}
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                    <tr>
                        <td style="padding:20px 40px;background:#f9fafb;border-top:1px solid #e5e7eb;">
                            <p style="margin:0;color:#6b7280;font-size:13px;line-height:20px;">
                                You are receiving this notification because alerts are enabled for this monitor.
                            </p>

                            <p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">
                                © 2026 PingBEAT. All rights reserved.
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>
</body>
</html>"""

        # Inject dynamic data into the HTML safely
        html_content = html_template.replace('{{monitor_name}}', monitor.name)
        html_content = html_content.replace('{{monitor_url}}', monitor.url)
        html_content = html_content.replace('{{timestamp}}', timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC'))
        html_content = html_content.replace('{{error_message}}', error_message or 'No issues')

        # Dynamically adjust HTML wording/colors if the service is UP (recovered)
        if is_up:
            html_content = html_content.replace('Service Down Detected', 'Service Recovery Detected')
            html_content = html_content.replace('currently unavailable.', 'currently back online.')
            html_content = html_content.replace('DOWN', 'UP')
            html_content = html_content.replace('background:#fee2e2;color:#b91c1c;', 'background:#dcfce3;color:#166534;')

        # 1. Handle Webhooks (Discord, Slack, Custom Webhook)
        if monitor.webhook_url:
            try:
                if monitor.notification_channel == 'discord':
                    payload = {
                        "content": f"{icon} **[{status_text.upper()}]** Monitor **{monitor.name}** ({monitor.url}) is {status_text.split(' ')[0]}.\n*Details:* {error_message or 'No issues'}"
                    }
                    http_requests.post(monitor.webhook_url, json=payload, timeout=10)
                
                elif monitor.notification_channel == 'slack':
                    payload = {
                        "text": f"{icon} *[{status_text.upper()}]* Monitor *{monitor.name}* ({monitor.url}) is {status_text.split(' ')[0]}.\n*Details:* {error_message or 'No issues'}"
                    }
                    http_requests.post(monitor.webhook_url, json=payload, timeout=10)
                
                elif monitor.notification_channel == 'webhook':
                    payload = {
                        "monitor_id": monitor.id,
                        "name": monitor.name,
                        "url": monitor.url,
                        "event": "recovered" if is_up else "outage",
                        "previous_status": "up" if previous_is_up else "down" if previous_is_up is not None else None,
                        "current_status": "up" if is_up else "down",
                        "error_message": error_message,
                        "timestamp": timezone.now().isoformat()
                    }
                    http_requests.post(monitor.webhook_url, json=payload, timeout=10)
            except Exception as e:
                print(f"Failed to send webhook notification for monitor {monitor_id}: {e}")

        # 2. Handle Email Alert
        if monitor.email_alerts and user.email:
            # Check if Brevo is configured
            brevo_key = getattr(settings, 'BREVO_API_KEY', None)
            brevo_email = getattr(settings, 'BREVO_SENDER_EMAIL', None)
            brevo_name = getattr(settings, 'BREVO_SENDER_NAME', 'Pingbeat')

            if brevo_key and brevo_email:
                url = "https://api.brevo.com/v3/smtp/email"
                headers = {
                    "accept": "application/json",
                    "content-type": "application/json",
                    "api-key": brevo_key
                }
                payload = {
                    "sender": {"name": brevo_name, "email": brevo_email},
                    "to": [{"email": user.email, "name": user.username}],
                    "subject": subject,
                    "textContent": body_text,
                    "htmlContent": html_content # Applied custom HTML here
                }
                try:
                    response = http_requests.post(url, json=payload, headers=headers, timeout=10)
                    if response.status_code in (200, 201, 202):
                        return f"Email alert sent to {user.email} successfully via Brevo API."
                except Exception as api_err:
                    print(f"Brevo API request exception: {api_err}")

            # Fallback
            send_mail(
                subject=subject,
                message=body_text,
                from_email=brevo_email or "alerts@pingbeat.com",
                recipient_list=[user.email],
                fail_silently=False,
                html_message=html_content # Applied custom HTML here
            )
            return f"Email alert sent to {user.email} successfully via backup backend."
            
    except Monitor.DoesNotExist:
        return f"Monitor {monitor_id} does not exist."


@shared_task
def cleanup_old_logs(days_to_keep=30):
    """Delete logs older than a configurable number of days to prevent database bloat."""
    cutoff_date = timezone.now() - timedelta(days=days_to_keep)
    deleted_count, _ = MonitorLog.objects.filter(checked_at__lt=cutoff_date).delete()
    apm_days = getattr(settings, 'APM_METRIC_RETENTION_DAYS', 7)
    apm_cutoff = timezone.now() - timedelta(days=apm_days)
    deleted_metrics, _ = ApiMetric.objects.filter(created_at__lt=apm_cutoff).delete()
    summary_cutoff = timezone.now() - timedelta(days=90)
    deleted_summaries, _ = ApiMetricSummary.objects.filter(minute_bucket__lt=summary_cutoff).delete()
    return (
        f"Deleted {deleted_count} logs older than {days_to_keep} days, "
        f"{deleted_metrics} APM metrics, and {deleted_summaries} APM summaries."
    )


@shared_task(bind=True, max_retries=3, default_retry_delay=5)
def process_apm_metrics(self, application_id, metrics):
    """Persist one SDK batch using bulk_create for ingest throughput."""
    try:
        rows = []
        for metric in metrics:
            timestamp = parse_datetime(metric['timestamp']) if isinstance(metric['timestamp'], str) else metric['timestamp']
            if timestamp and timezone.is_naive(timestamp):
                timestamp = timezone.make_aware(timestamp, datetime_timezone.utc)

            rows.append(ApiMetric(
                application_id=application_id,
                endpoint=metric['endpoint'],
                method=metric['method'].upper(),
                status_code=metric['status_code'],
                response_time_ms=round(float(metric['response_time_ms']), 2),
                timestamp=timestamp or timezone.now(),
                error_message=(metric.get('error_message') or '')[:2000],
            ))

        ApiMetric.objects.bulk_create(rows, batch_size=1000, ignore_conflicts=True)
        return f"Saved {len(rows)} APM metrics for application {application_id}."
    except Exception as exc:
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=5, default_retry_delay=15)
def aggregate_apm_metrics(self, minutes_back=10):
    task_name = 'aggregate_apm_metrics'
    if not _acquire_task_lock(task_name):
        return f'{task_name} already running'

    try:
        end = timezone.now().replace(second=0, microsecond=0)
        start = end - timedelta(minutes=minutes_back)
        metrics = ApiMetric.objects.filter(
            timestamp__gte=start,
            timestamp__lt=end,
        ).only('application_id', 'endpoint', 'status_code', 'response_time_ms', 'timestamp')

        groups = defaultdict(list)
        for metric in metrics:
            minute_bucket = metric.timestamp.replace(second=0, microsecond=0)
            groups[(metric.application_id, metric.endpoint, minute_bucket)].append(metric)

        updated_count = 0
        for (application_id, endpoint, minute_bucket), rows in groups.items():
            request_count = len(rows)
            response_times = [row.response_time_ms for row in rows]
            error_count = len([row for row in rows if row.status_code >= 400])
            avg_response_time = sum(response_times) / request_count

            ApiMetricSummary.objects.update_or_create(
                application_id=application_id,
                endpoint=endpoint,
                minute_bucket=minute_bucket,
                defaults={
                    'requests_count': request_count,
                    'avg_response_time': round(avg_response_time, 2),
                    'p95_latency': round(percentile(response_times, 95), 2),
                    'p99_latency': round(percentile(response_times, 99), 2),
                    'error_rate': round((error_count / request_count) * 100, 2),
                },
            )
            updated_count += 1

        return f"Updated {updated_count} APM summary buckets."
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        _release_task_lock(task_name)


@shared_task(bind=True, max_retries=5, default_retry_delay=15)
def check_apm_slow_endpoints(self):
    task_name = 'check_apm_slow_endpoints'
    if not _acquire_task_lock(task_name):
        return f'{task_name} already running'

    try:
        threshold_ms = getattr(settings, 'APM_SLOW_ENDPOINT_THRESHOLD_MS', 2000)
        window = timezone.now() - timedelta(minutes=5)
        summaries = ApiMetricSummary.objects.filter(
            minute_bucket__gte=window,
            p95_latency__gte=threshold_ms,
        ).select_related('application__user')

        sent = 0
        for summary in summaries:
            alert_key = f'apm_slow_alert:{summary.application_id}:{summary.endpoint}'
            if cache.get(alert_key):
                continue
            _send_apm_slow_endpoint_email(summary, threshold_ms)
            cache.set(alert_key, True, timeout=3600)
            sent += 1

        return f"Sent {sent} APM slow endpoint alerts."
    except Exception as exc:
        raise self.retry(exc=exc)
    finally:
        _release_task_lock(task_name)


def _send_apm_slow_endpoint_email(summary, threshold_ms):
    user = summary.application.user
    if not user.email:
        return

    subject = f"[PingBEAT APM] Slow endpoint detected: {summary.endpoint}"
    body = (
        f"Application: {summary.application.name}\n"
        f"Endpoint: {summary.endpoint}\n"
        f"P95 Latency: {summary.p95_latency:.0f}ms (threshold: {threshold_ms}ms)\n"
        "Period: last 5 minutes\n\n"
        "View in dashboard: https://pingbeat.in/apm\n"
    )
    send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
