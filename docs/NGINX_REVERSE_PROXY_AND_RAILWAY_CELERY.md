# Nginx Reverse Proxy + Railway Celery

This setup keeps the existing deployments:

- Frontend: `https://pingbeat.vercel.app`
- Backend: `https://pingbeat-3.onrender.com`
- Public app domain: points to a small Nginx container

Nginx routes:

- `/api/*` -> Render Django backend
- everything else -> Vercel frontend

## Nginx Proxy Service

Deploy the `nginx/` folder as a Docker service on Railway, Render, Fly.io, or a VPS.

Environment variables:

```env
PORT=80
FRONTEND_ORIGIN=https://pingbeat.vercel.app
BACKEND_ORIGIN=https://pingbeat-3.onrender.com
```

On Railway, Railway provides `PORT` automatically. If Railway injects a different
port, use that value and keep the Dockerfile exposed port as-is.

After deployment, point your custom domain to this Nginx service. Users should
visit the Nginx domain, not the direct Vercel URL, if you want all traffic to
flow through the reverse proxy.

## Frontend API Calls

The frontend already uses relative API calls:

```js
baseURL: '/api'
```

So no frontend code change is required.

## Railway Celery Services

Create two Railway services from the same repo/backend code.

Worker start command:

```bash
celery -A config worker --loglevel=info
```

Low-memory worker start command:

```bash
celery -A config worker --loglevel=info --pool=solo
```

Beat start command:

```bash
celery -A config beat --loglevel=info
```

Run only one beat service.

## Shared Environment

Render Django, Railway Celery worker, and Railway Celery beat must use the same
Postgres and Redis:

```env
DEBUG=False
DJANGO_SETTINGS_MODULE=config.settings
SECRET_KEY=use-the-same-secret-as-render
DATABASE_URL=your-shared-postgres-url
REDIS_URL=your-shared-redis-url
DB_SSL_REQUIRE=True
PINGBEAT_APM_SYNC_INGEST=False
PINGBEAT_APM_LOCAL_CAPTURE=False
PINGBEAT_APM_INGEST_URL=https://pingbeat-3.onrender.com/api/apm/ingest/
```

If Redis is on Railway and Render needs to use it too, use Railway Redis'
public TCP proxy URL for `REDIS_URL`, not the private Railway internal URL.
