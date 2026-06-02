# PingBEAT APM Integration Guide

This guide shows the easiest way to send application performance metrics from a Django or FastAPI app into PingBEAT using an APM API key.

PingBEAT APM captures:

- Endpoint path
- HTTP method
- Response status code
- Response time in milliseconds
- Timestamp

It does not collect request bodies, headers, cookies, tokens, or user data.

## 1. Create an APM Application

1. Open PingBEAT.
2. Go to `APM`.
3. Create an application, for example `Billing API`.
4. Copy the generated API key. It starts with `pb_`.

Your ingest URL is:

```text
https://pingbeat.in/api/apm/ingest/
```

For this deployment, that is usually:

```text
https://pingbeat-3.onrender.com/api/apm/ingest/
```

## 2. Environment Variables

Add these to the app you want to monitor:

```env
PINGBEAT_APM_API_KEY=pb_your_api_key_here
PINGBEAT_APM_INGEST_URL=https://pingbeat.in/api/apm/ingest/
PINGBEAT_APM_TIMEOUT_SECONDS=3
```

Keep the API key secret. Do not commit it to git.

## 3. Payload Format

Both Django and FastAPI examples below send this JSON shape:

```json
{
  "api_key": "pb_your_api_key_here",
  "metrics": [
    {
      "endpoint": "/api/orders/",
      "method": "GET",
      "status_code": 200,
      "response_time_ms": 42.5,
      "timestamp": "2026-06-01T12:00:00+00:00"
    }
  ]
}
```

PingBEAT accepts batches up to 1000 metrics per request. The quick setup below sends one metric after each request, which is easiest to understand and good enough for small apps. For high traffic apps, batch metrics in memory and flush every few seconds.

## 4. Django Integration

Install `requests` if your app does not already have it:

```bash
pip install requests
```

Create `pingbeat_apm.py` in your Django project, next to `settings.py`:

```python
import os
import time
from datetime import datetime, timezone
from threading import Thread

import requests


def send_pingbeat_metric(metric):
    api_key = os.environ.get("PINGBEAT_APM_API_KEY")
    ingest_url = os.environ.get("PINGBEAT_APM_INGEST_URL")
    timeout = float(os.environ.get("PINGBEAT_APM_TIMEOUT_SECONDS", "3"))

    if not api_key or not ingest_url:
        return

    try:
        requests.post(
            ingest_url,
            json={"api_key": api_key, "metrics": [metric]},
            timeout=timeout,
        )
    except requests.RequestException:
        pass


class PingBeatAPMMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        response = self.get_response(request)
        elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

        metric = {
            "endpoint": request.path,
            "method": request.method,
            "status_code": response.status_code,
            "response_time_ms": elapsed_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        Thread(target=send_pingbeat_metric, args=(metric,), daemon=True).start()
        return response
```

Add the middleware in `settings.py`:

```python
MIDDLEWARE = [
    # Keep Django security/session middleware first if already present.
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",

    # Add PingBEAT after basic request setup and before most app logic.
    "your_project.pingbeat_apm.PingBeatAPMMiddleware",

    # Existing middleware continues here.
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]
```

Replace `your_project.pingbeat_apm.PingBeatAPMMiddleware` with the real import path for your project.

Restart Django and make a request to any endpoint. Metrics should appear in PingBEAT APM after ingestion and aggregation run.

## 5. FastAPI Integration

Install `httpx` if your app does not already have it:

```bash
pip install httpx
```

Add this to your FastAPI app file, usually `main.py`:

```python
import os
import time
from datetime import datetime, timezone

import httpx
from fastapi import FastAPI, Request


app = FastAPI()


async def send_pingbeat_metric(metric):
    api_key = os.environ.get("PINGBEAT_APM_API_KEY")
    ingest_url = os.environ.get("PINGBEAT_APM_INGEST_URL")
    timeout = float(os.environ.get("PINGBEAT_APM_TIMEOUT_SECONDS", "3"))

    if not api_key or not ingest_url:
        return

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            await client.post(
                ingest_url,
                json={"api_key": api_key, "metrics": [metric]},
            )
    except httpx.HTTPError:
        pass


@app.middleware("http")
async def pingbeat_apm_middleware(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

    metric = {
        "endpoint": request.url.path,
        "method": request.method,
        "status_code": response.status_code,
        "response_time_ms": elapsed_ms,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }

    await send_pingbeat_metric(metric)
    return response
```

For a busier FastAPI app, send the metric in a background task or batch metrics before posting so user responses do not wait on the PingBEAT ingest request.

## 6. Skip Noisy Paths

Health checks and static assets can create noisy metrics. Add a small skip list if needed.

Django:

```python
SKIP_PREFIXES = ("/health", "/static", "/favicon.ico")

if request.path.startswith(SKIP_PREFIXES):
    return response
```

FastAPI:

```python
SKIP_PREFIXES = ("/health", "/static", "/favicon.ico")

if request.url.path.startswith(SKIP_PREFIXES):
    return response
```

Place the check before creating and sending the metric.

## 7. Test With Curl

You can confirm the API key and ingest URL manually:

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

## 8. Troubleshooting

If metrics do not appear:

- Confirm `PINGBEAT_APM_API_KEY` starts with `pb_`.
- Confirm `PINGBEAT_APM_INGEST_URL` ends with `/api/apm/ingest/`.
- Confirm the monitored app can reach the PingBEAT backend over HTTPS.
- Check PingBEAT backend logs for `Invalid API key`.
- Make sure the PingBEAT Celery worker is running if async ingest is enabled.
- Wait one aggregation cycle before expecting dashboard charts to update.

## 9. Production Tips

- Use HTTPS for the ingest URL.
- Keep API keys in environment variables or a secret manager.
- Do not send request bodies, headers, cookies, or authorization tokens.
- Batch metrics for high traffic apps.
- Keep request timeouts short, for example 2 to 5 seconds.
- Exclude health checks, static files, and admin paths if they are noisy.
