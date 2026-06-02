# PingBEAT APM SDK Integration

Use this page as the source of truth for adding PingBEAT APM to application frameworks. The simplest model is framework-neutral: measure each request after it completes, then send a metric batch to `POST /api/apm/ingest/`.

PingBEAT collects only:

- Endpoint path
- HTTP method
- Response status code
- Response time in milliseconds
- Timestamp

Do not send request bodies, headers, cookies, tokens, authorization values, or user data.

## 1. Create an APM Application

1. Open PingBEAT.
2. Go to `APM`.
3. Create an application for the service and environment.
4. Copy the generated API key. It starts with `pb_`.

Your ingest URL is:

```text
https://pingbeat.in/api/apm/ingest/
```

## 2. Environment Variables

```env
PINGBEAT_APM_API_KEY=pb_your_api_key_here
PINGBEAT_APM_INGEST_URL=https://pingbeat.in/api/apm/ingest/
PINGBEAT_APM_TIMEOUT_SECONDS=3
```

Keep the API key server-side and out of git.

## 3. Universal Payload

Any framework can integrate with PingBEAT by sending this JSON shape:

```json
{
  "api_key": "pb_your_api_key_here",
  "metrics": [
    {
      "endpoint": "/api/orders",
      "method": "GET",
      "status_code": 200,
      "response_time_ms": 42.5,
      "timestamp": "2026-06-01T12:00:00+00:00"
    }
  ]
}
```

The backend accepts batches up to 1000 metrics. For high-traffic services, buffer metrics in memory and flush every few seconds.

## 4. Framework Recipes

The public docs page at `/apm/doc` includes ready-to-copy snippets for:

- Django middleware
- FastAPI middleware
- Flask request hooks
- Express middleware
- Generic HTTP ingestion for any other framework

For additional frameworks, implement the same five steps:

1. Capture a high-resolution start time before request handling.
2. Let the framework produce the response.
3. Calculate elapsed milliseconds after response completion.
4. Build the universal metric payload.
5. Send the payload asynchronously or through a bounded in-memory batcher.

## 5. Manual Verification

```bash
curl -X POST "https://pingbeat.in/api/apm/ingest/" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "pb_your_api_key_here",
    "metrics": [
      {
        "endpoint": "/manual-test",
        "method": "GET",
        "status_code": 200,
        "response_time_ms": 12.34,
        "timestamp": "2026-06-01T12:00:00+00:00"
      }
    ]
  }'
```

Expected response:

```json
{
  "status": "accepted",
  "application_id": 1,
  "queued_metrics": 1
}
```

## 6. Skip Noisy Paths

Exclude health checks, static assets, admin routes, and internal polling endpoints.

```python
SKIP_PREFIXES = ("/health", "/static", "/favicon.ico", "/admin")

if request.path.startswith(SKIP_PREFIXES):
    return response
```

## 7. Troubleshooting

- Confirm `PINGBEAT_APM_API_KEY` starts with `pb_`.
- Confirm `PINGBEAT_APM_INGEST_URL` ends with `/api/apm/ingest/`.
- Confirm the monitored service can reach PingBEAT over HTTPS.
- Check PingBEAT backend logs for invalid API key errors.
- Keep batches at or below 1000 metrics.
- Wait for one aggregation cycle before expecting dashboard charts to update.
- Run Celery worker and Celery Beat when async ingest and aggregation are enabled.

## 8. Production Notes

- Use HTTPS in production.
- Keep timeouts short, usually 2 to 5 seconds.
- Send metrics out-of-band so user responses do not wait on PingBEAT.
- Batch metrics for busy services.
- Add per-key rate limits before opening ingestion to untrusted networks.
- Rotate application API keys if they are exposed.
