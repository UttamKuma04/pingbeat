# 🚀 Render Build & Start Commands Reference

Use these exact commands in Render configuration for each service.

## Backend Web Service

### Build Command:
```
pip install -r requirements.txt
```

### Start Command (Choose One):

**Option 1: With Auto-Migration (Recommended)**
```
cd backend && python manage.py migrate && python manage.py collectstatic --noinput && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

**Option 2: Minimal (Migrations must be run manually)**
```
cd backend && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
```

**Option 3: Development/Debugging**
```
cd backend && python manage.py migrate && python manage.py runserver 0.0.0.0:$PORT
```

### Recommended Environment Variables:
```env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379/0
SECRET_KEY=<generate-random-32-char-string>
DEBUG=False
ALLOWED_HOSTS=*.render.com,yourdomain.com
BREVO_API_KEY=<your-key>
BREVO_SENDER_EMAIL=alerts@yourdomain.com
BREVO_SENDER_NAME=PingBEAT
PINGBEAT_APM_API_KEY=pb_<generated-key>
PINGBEAT_APM_INGEST_URL=https://pingbeat-backend.onrender.com/api/apm/ingest/
```

---

## Celery Worker (Background Worker)

### Build Command:
```
pip install -r requirements.txt
```

### Start Command:
```
cd backend && celery -A config worker --loglevel=info
```

### Alternative (Better for Render):
```
cd backend && celery -A config worker --pool=solo --loglevel=info
```

### Environment Variables:
```env
(Same as Backend)
```

---

## Celery Beat (Background Worker)

### Build Command:
```
pip install -r requirements.txt
```

### Start Command:
```
cd backend && celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Environment Variables:
```env
(Same as Backend)
```

---

## Frontend (Static Site)

### Build Command:
```
npm install && npm run build
```

### Publish Directory:
```
dist
```

### Environment Variables:
```env
VITE_API_URL=https://pingbeat-backend.onrender.com/api
```

### Optional Custom Headers (Add via render.json if needed):
```json
{
  "routes": [
    {
      "path": "/*",
      "methods": ["GET"],
      "handler": "public/index.html"
    }
  ]
}
```

---

## All Services: Environment Variables Template

### Copy & Modify This:

```env
# Database
DATABASE_URL=postgresql://pingbeat_user:PASSWORD@dpg-xxx.render.com:5432/pingbeat

# Redis (For Celery Broker)
REDIS_URL=redis://red-xxx.render.com:10xxx/0
# OR for Render Redis:
# REDIS_URL=redis://:PASSWORD@dpg-xxx.render.com:10xxx/0

# Django Configuration
DEBUG=False
SECRET_KEY=abcdef1234567890abcdef1234567890
ALLOWED_HOSTS=*.render.com,pingbeat.yourdomain.com
DJANGO_SETTINGS_MODULE=config.settings

# Email (Brevo)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxx
BREVO_SENDER_EMAIL=alerts@yourdomain.com
BREVO_SENDER_NAME=PingBEAT

# PingBEAT Self-APM
PINGBEAT_APM_API_KEY=pb_xxxxxxxxxxxxx
PINGBEAT_APM_INGEST_URL=https://pingbeat-backend.onrender.com/api/apm/ingest/
PINGBEAT_APM_SYNC_INGEST=False
PINGBEAT_APM_FLUSH_INTERVAL_SECONDS=30

# Frontend
VITE_API_URL=https://pingbeat-backend.onrender.com/api
```

---

## Initial Post-Deploy Commands (SSH into Backend)

```bash
# Run migrations
python manage.py migrate

# Create superuser (interactive)
python manage.py createsuperuser

# Or non-interactive:
python manage.py createsuperuser --noinput \
  --username admin \
  --email admin@example.com

# Collect static files
python manage.py collectstatic --noinput

# Create Celery Beat schedules (one-time)
python manage.py shell << EOF
from django_celery_beat.models import PeriodicTask, IntervalSchedule

# Get or create 30-second interval
schedule, created = IntervalSchedule.objects.get_or_create(
    every=30,
    period='seconds'
)

# Create periodic task
PeriodicTask.objects.update_or_create(
    name='Check Monitors Every 30s',
    defaults={
        'task': 'monitoring.tasks.check_monitors',
        'interval': schedule,
        'enabled': True,
    }
)
print("Celery Beat task created!")
EOF

# Verify setup
python manage.py check
```

---

## Common Port Numbers

| Service | Port | Note |
|---------|------|------|
| Django Backend | 8000 (auto via $PORT) | Uses Render $PORT env var |
| React Dev | 5173 | Not used in production |
| PostgreSQL | 5432 | Internal only |
| Redis | 6379 | Internal only |

---

## Environment Variable Reference

| Variable | Required | Example | Notes |
|----------|----------|---------|-------|
| DATABASE_URL | ✅ | `postgresql://user:pass@host/db` | From Render PostgreSQL |
| REDIS_URL | ✅ | `redis://host:6379/0` | From Render Redis |
| SECRET_KEY | ✅ | `aB12cd34eF56gH78iJ90kL12mN34` | Generate with `openssl rand -hex 32` |
| DEBUG | ⚠️ | `False` | ALWAYS False in production |
| ALLOWED_HOSTS | ✅ | `*.render.com` | Add your domain |
| BREVO_API_KEY | ❌ | `xkeysib-...` | Optional, for email alerts |
| BREVO_SENDER_EMAIL | ❌ | `alerts@domain.com` | Optional, for email alerts |
| VITE_API_URL | ✅ | `https://backend.onrender.com/api` | For frontend |

---

## Testing Deployed Services

### Test Backend API:
```bash
curl https://pingbeat-backend.onrender.com/api/
# Should return JSON with available endpoints or 401
```

### Test Frontend:
```bash
curl https://pingbeat-frontend.onrender.com
# Should return HTML content
```

### Test Database Connection:
```bash
# SSH into backend
python -c "from django.db import connection; connection.ensure_connection(); print('✅ Database connected!')"
```

### Test Redis Connection:
```bash
# SSH into any service
redis-cli -u "$REDIS_URL" ping
# Should respond: PONG
```

### Test Celery:
```bash
# SSH into backend
python manage.py shell
# Then run:
from celery import current_app
current_app.control.inspect().ping()
```

---

## Performance Tuning

### For Production Gunicorn:
```
gunicorn config.wsgi:application \
  --bind 0.0.0.0:$PORT \
  --workers 3 \
  --worker-class sync \
  --worker-connections 1000 \
  --max-requests 1000 \
  --timeout 30 \
  --access-logfile - \
  --error-logfile -
```

### For Production Celery:
```
celery -A config worker \
  --loglevel=info \
  --concurrency=4 \
  --max-tasks-per-child=1000 \
  --without-gossip \
  --without-mingle \
  --without-heartbeat
```

---

## Debugging: Enable Debug Mode (Temporary Only!)

To debug issues, temporarily set in environment:
```env
DEBUG=True
```

Then check logs for detailed error messages. **Remember to set back to `False` after debugging!**

---

## Scale Settings

### When Services Get Busy:

**Backend**: Increase workers
```
--workers 4  # Default: 2
```

**Celery**: Increase concurrency
```
--concurrency 8  # Default: 4
```

**Database**: Upgrade plan (via Render dashboard)

**Redis**: Upgrade plan (via Render dashboard)

---

## Quick Deploy Script

Save as `deploy.sh` in your repo root:

```bash
#!/bin/bash
set -e

echo "🚀 PingBEAT Deployment Script"
echo "================================"

# Check if on main branch
BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "❌ Not on main branch. Switch with: git checkout main"
  exit 1
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Wait for Render to pick it up
echo "⏳ Render will auto-deploy when it detects the push"
echo "📊 Monitor at: https://dashboard.render.com"
echo "✅ Deployment initiated!"
```

Usage:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

That's all you need! 🎉
