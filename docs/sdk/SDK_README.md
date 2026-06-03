# PingBEAT APM SDK

Lightweight, single-file SDKs that send application performance metrics to your [PingBEAT](https://github.com/your-org/pingbeat) instance.

| Language | File | Frameworks | Dependencies |
|----------|------|------------|--------------|
| Python | `pingbeat_sdk.py` | Django · FastAPI · Flask | `requests` |
| Node.js | `pingbeat_sdk.js` | Express | None (uses built-in `fetch`) |

---

## How It Works

```
Your App  ──▶  SDK captures endpoint, method, status, latency
                    │
                    ▼
              In-memory buffer (thread-safe)
                    │
          ┌─────────┴──────────┐
          │                    │
     Every 30s           Buffer ≥ 500
          │                    │
          └─────────┬──────────┘
                    ▼
           HTTP POST to PingBEAT
           /api/apm/ingest/
```

The SDK **never crashes your app** — all network errors are silently swallowed.

---

## Prerequisites

1. A running PingBEAT instance
2. An APM application created in PingBEAT's APM dashboard → copy the `pb_xxxxx` API key

---

## Python SDK

### Installation

Copy `pingbeat_sdk.py` into your project, or install `requests` if you don't already have it:

```bash
pip install requests
```

### Django

```python
# settings.py  (or wsgi.py / asgi.py — anywhere that runs once at startup)

import pingbeat_sdk as pingbeat

pingbeat.init(
    api_key="pb_xxxxx",
    ingest_url="https://your-pingbeat.com/api/apm/ingest/",
)

MIDDLEWARE = [
    "pingbeat_sdk.PingBeatDjangoMiddleware",   # place early for accurate timing
    "django.middleware.security.SecurityMiddleware",
    # ...
]
```

**That's it.** Every request is now tracked automatically.

---

### FastAPI

```python
from fastapi import FastAPI
import pingbeat_sdk as pingbeat

pingbeat.init(
    api_key="pb_xxxxx",
    ingest_url="https://your-pingbeat.com/api/apm/ingest/",
)

app = FastAPI()
app.add_middleware(pingbeat.PingBeatFastAPIMiddleware)

@app.get("/")
async def root():
    return {"status": "ok"}
```

---

### Flask

```python
from flask import Flask
import pingbeat_sdk as pingbeat

pingbeat.init(
    api_key="pb_xxxxx",
    ingest_url="https://your-pingbeat.com/api/apm/ingest/",
)

app = Flask(__name__)
pingbeat.pingbeat_flask_init(app)

@app.route("/")
def index():
    return "Hello!"
```

---

### Manual Capture (any Python app)

For background jobs, CLI scripts, or custom instrumentation:

```python
import time
import pingbeat_sdk as pingbeat

pingbeat.init(
    api_key="pb_xxxxx",
    ingest_url="https://your-pingbeat.com/api/apm/ingest/",
)

start = time.perf_counter()
# ... your task ...
elapsed = (time.perf_counter() - start) * 1000

pingbeat.capture(
    endpoint="/jobs/send-email",
    method="TASK",
    status_code=200,
    response_time_ms=elapsed,
)
```

---

## Node.js SDK

### Installation

Copy `pingbeat_sdk.js` into your project. No npm packages required (uses built-in `fetch` on Node ≥ 18).

### Express

```javascript
const express = require("express");
const pingbeat = require("./pingbeat_sdk");

pingbeat.init({
  apiKey:    "pb_xxxxx",
  ingestUrl: "https://your-pingbeat.com/api/apm/ingest/",
});

const app = express();
app.use(pingbeat.expressMiddleware());

app.get("/", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(3000);
```

### Manual Capture (any Node.js app)

```javascript
const pingbeat = require("./pingbeat_sdk");

pingbeat.init({
  apiKey:    "pb_xxxxx",
  ingestUrl: "https://your-pingbeat.com/api/apm/ingest/",
});

const start = performance.now();
// ... your task ...
const elapsed = performance.now() - start;

pingbeat.capture({
  endpoint:       "/jobs/process-order",
  method:         "TASK",
  statusCode:     200,
  responseTimeMs: elapsed,
});
```

---

## Configuration Reference

### Python — `pingbeat.init()` parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `api_key` | `str` | — | **Required.** Your `pb_xxxxx` API key |
| `ingest_url` | `str` | — | **Required.** PingBEAT ingest endpoint URL |
| `flush_interval` | `float` | `30` | Seconds between timer flushes |
| `max_batch_size` | `int` | `500` | Buffer size that triggers immediate flush |
| `timeout` | `float` | `5` | HTTP POST timeout (seconds) |
| `sample_rate` | `float` | `1.0` | Fraction of requests to capture (`0.0` – `1.0`) |
| `excluded_paths` | `tuple` | `("/health", "/readyz", "/favicon.ico")` | URL prefixes to skip |
| `debug` | `bool` | `False` | Log flush activity |

### Node.js — `pingbeat.init()` options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | **Required.** Your `pb_xxxxx` API key |
| `ingestUrl` | `string` | — | **Required.** PingBEAT ingest endpoint URL |
| `flushInterval` | `number` | `30000` | Timer flush interval in ms |
| `maxBatchSize` | `number` | `500` | Buffer size trigger |
| `timeout` | `number` | `5000` | HTTP timeout in ms |
| `sampleRate` | `number` | `1.0` | Sampling rate (`0.0` – `1.0`) |
| `excludedPaths` | `string[]` | `["/health", "/readyz", "/favicon.ico"]` | Path prefixes to skip |
| `debug` | `boolean` | `false` | Log to console |

---

## What Gets Sent

Each flush sends a single JSON payload matching PingBEAT's ingest API:

```json
{
  "api_key": "pb_xxxxx",
  "metrics": [
    {
      "endpoint": "/api/orders",
      "method": "GET",
      "status_code": 200,
      "response_time_ms": 145.23,
      "timestamp": "2026-06-03T20:00:00.000Z"
    },
    {
      "endpoint": "/api/users/42",
      "method": "PUT",
      "status_code": 204,
      "response_time_ms": 89.10,
      "timestamp": "2026-06-03T20:00:01.000Z"
    }
  ]
}
```

---

## Tips

- **Place middleware early** in the stack so timing includes all downstream middleware
- **Use `sample_rate`** in high-traffic apps — e.g. `0.1` captures 10% of requests
- **Exclude noisy paths** like health checks, static assets, and the ingest endpoint itself
- **Manual capture** works great for background jobs, cron tasks, and queue workers
- **Force flush** with `pingbeat.flush()` before graceful shutdown in serverless environments

---

## Architecture Inspiration

This SDK draws from the best patterns in industry APM platforms:

| Pattern | Inspired by |
|---------|-------------|
| One-line `init()` setup | Sentry Performance |
| Dual-trigger batching (time + size) | Datadog APM |
| Silent failure / never crash host | All platforms |
| Framework middleware hooks | Elastic APM |
| Configurable sampling rate | Sentry + OpenTelemetry |
| Graceful shutdown flush | New Relic agent |
