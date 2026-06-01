# 🔧 Render Deployment Troubleshooting Guide

## Common Issues & Solutions

### 1. Backend Returns `502 Bad Gateway`

**Symptoms**: Backend URL shows 502 error, page won't load

**Solutions**:
1. Check Backend logs in Render dashboard:
   - Click Backend service → Logs
   - Look for errors related to database or Redis

2. Verify DATABASE_URL:
   ```bash
   # SSH into backend service or use shell
   python -c "import dj_database_url; print(dj_database_url.parse('$DATABASE_URL'))"
   ```

3. Verify migrations ran:
   ```bash
   python manage.py migrate
   ```

4. Check if Gunicorn is running:
   ```bash
   ps aux | grep gunicorn
   ```

5. Restart the service:
   - Render Dashboard → Backend → Logs → Restart

---

### 2. Database Connection Timeout

**Symptoms**: `Error connecting to postgres://...`

**Solutions**:
1. Verify DATABASE_URL is correct:
   - Go to Render Dashboard → PostgreSQL → Info
   - Copy **Internal Database URL** (for internal services)
   - NOT the **External Database URL**

2. Check DATABASE_URL format:
   ```
   postgresql://user:password@host:5432/database
   ```

3. For SSL issues, ensure DATABASE_URL includes:
   ```
   postgresql://...?sslmode=require
   ```

4. Verify database is running:
   - Render Dashboard → PostgreSQL → Metrics
   - Check CPU and memory

5. Test connection manually:
   ```bash
   psql "$DATABASE_URL"
   ```

---

### 3. Redis Connection Error

**Symptoms**: `ConnectionError: Error 111 connecting to redis://...`

**Solutions**:
1. Verify REDIS_URL is correct:
   - Render Dashboard → Redis → Info
   - Copy **Internal Redis URL**

2. Check format:
   ```
   redis://host:6379/0
   ```

3. For TLS Redis (rediss://):
   ```
   rediss://host:6380?ssl_cert_reqs=none
   ```

4. Test connection:
   ```bash
   redis-cli -u "$REDIS_URL" ping
   ```

5. Check Redis is running:
   - Render Dashboard → Redis → Metrics

6. Restart Celery workers:
   - Celery Worker → Logs → Restart

---

### 4. Celery Tasks Not Running

**Symptoms**: Monitor checks don't run, no data in logs

**Solutions**:
1. Check Celery Beat is running:
   ```bash
   # In Celery Beat logs
   Should show: "Scheduler: Sending due task check_monitors"
   ```

2. Check Celery Worker is running:
   ```bash
   # In Celery Worker logs
   Should show: "ready to accept tasks"
   ```

3. Verify both have same Redis/Database URLs

4. Check scheduled tasks:
   ```bash
   # SSH into backend
   python manage.py shell
   from django_celery_beat.models import PeriodicTask
   PeriodicTask.objects.all()
   ```

5. If tasks don't exist, create them:
   ```bash
   python manage.py migrate
   python manage.py shell
   # Run this:
   from django_celery_beat.models import PeriodicTask, IntervalSchedule
   schedule, _ = IntervalSchedule.objects.get_or_create(every=30, period='seconds')
   PeriodicTask.objects.get_or_create(
       name='Check Monitors',
       task='monitoring.tasks.check_monitors',
       interval=schedule
   )
   ```

---

### 5. CORS Error: `Access to XMLHttpRequest blocked`

**Symptoms**: Frontend can't connect to backend API

**Solutions**:
1. Check ALLOWED_HOSTS in backend environment:
   ```
   ALLOWED_HOSTS=*.render.com,yourdomain.com
   ```

2. Verify frontend URL matches:
   - Frontend URL: `https://pingbeat-frontend.onrender.com`
   - Backend ALLOWED_HOSTS must include this domain

3. If using custom domain, add it to ALLOWED_HOSTS:
   ```
   ALLOWED_HOSTS=pingbeat.yourdomain.com,*.render.com
   ```

4. Check VITE_API_URL is correct:
   ```
   VITE_API_URL=https://pingbeat-backend.onrender.com/api
   ```

5. For local testing, set:
   ```
   CORS_ALLOW_ALL_ORIGINS=True  # Only for testing!
   ```

---

### 6. Frontend Shows Blank Page / 404

**Symptoms**: Frontend loads but shows nothing

**Solutions**:
1. Check frontend build logs:
   - Render Dashboard → Frontend (Static Site) → Logs
   - Look for build errors

2. Verify build command:
   ```
   npm install && npm run build
   ```

3. Check publish directory:
   ```
   dist/
   ```

4. If using environment variables:
   ```bash
   # In vite.config.js, ensure VITE_API_URL is read correctly
   console.log("API URL:", process.env.VITE_API_URL);
   ```

5. Check if index.html exists:
   ```bash
   ls -la dist/index.html
   ```

6. Verify frontend/src/main.jsx is correct

---

### 7. Migrations Not Running

**Symptoms**: `ProgrammingError: relation "auth_user" does not exist`

**Solutions**:
1. SSH into backend service and run:
   ```bash
   python manage.py migrate
   python manage.py migrate --run-syncdb
   ```

2. For fresh database:
   ```bash
   python manage.py migrate --no-input
   python manage.py createsuperuser --no-input --username admin --email admin@example.com
   ```

3. Make migrations not auto-running, modify start command:
   ```
   cd backend && python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
   ```

---

### 8. Static Files Not Loading (404)

**Symptoms**: CSS/JS files return 404 in admin

**Solutions**:
1. Collect static files:
   ```bash
   python manage.py collectstatic --noinput
   ```

2. Add to backend start command:
   ```
   python manage.py migrate && python manage.py collectstatic --noinput && gunicorn ...
   ```

3. Check Gunicorn is configured correctly:
   ```bash
   gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
   ```

---

### 9. Email Alerts Not Sending

**Symptoms**: No emails received when monitor goes down

**Solutions**:
1. Verify Brevo API key:
   ```bash
   curl -X GET https://api.brevo.com/v3/account \
     -H "api-key: $BREVO_API_KEY"
   ```

2. Check backend has:
   ```env
   BREVO_API_KEY=xkeysib-...
   BREVO_SENDER_EMAIL=your-email@example.com
   ```

3. Check task logs for email sending:
   ```bash
   # In celery worker logs
   Should show: "Sending email to..."
   ```

4. Test locally first:
   ```bash
   python manage.py shell
   from django.core.mail import send_mail
   send_mail('Test', 'Body', 'from@example.com', ['to@example.com'])
   ```

---

### 10. High Memory Usage / Service Killed

**Symptoms**: Service restarts repeatedly, OOM errors

**Solutions**:
1. Check memory usage:
   - Service → Metrics → Memory
   - If consistently above 80%, upgrade plan

2. Reduce worker count:
   ```
   gunicorn config.wsgi:application --bind 0.0.0.0:$PORT --workers 2
   ```

3. Set Celery worker pool:
   ```
   celery -A config worker --pool=solo --loglevel=info
   ```

4. For production, use:
   - Backend: `Standard` plan ($7+)
   - Celery: `Standard` plan ($7+ each)
   - Database: At least `Starter` plan

---

### 11. Logs Not Showing Data

**Symptoms**: Monitor created but no logs/results show up

**Solutions**:
1. Check if Celery worker is running:
   - Render Dashboard → Celery Worker → Logs
   - Should show "ready to accept tasks"

2. Check if Celery Beat is running:
   - Render Dashboard → Celery Beat → Logs
   - Should show scheduled tasks

3. Check if tasks are being queued:
   ```bash
   # In Redis
   redis-cli -u "$REDIS_URL" KEYS "*"
   ```

4. Check database for monitors:
   ```bash
   # SSH into backend
   python manage.py shell
   from monitoring.models import Monitor
   Monitor.objects.all()
   ```

5. Check for task failures:
   ```bash
   # In Celery Beat logs, look for exceptions
   tail -f /path/to/celery.log
   ```

---

## Quick Diagnostic Commands

### Check if backend is healthy:
```bash
curl https://pingbeat-backend.onrender.com/api/
# Should return 401 or API response, not 502
```

### Check database connection:
```bash
# SSH into backend
python -c "from django.db import connection; connection.ensure_connection()"
echo $?  # Should return 0
```

### Check Redis connection:
```bash
# SSH into any service with REDIS_URL
redis-cli -u "$REDIS_URL" ping
# Should return PONG
```

### Check migrations:
```bash
python manage.py showmigrations
# Should show all migrations as [X]
```

### Check Celery status:
```bash
# SSH into backend
celery -A config inspect active
celery -A config inspect scheduled
```

---

## Render Support & Docs

- **Render Status**: https://status.render.com
- **Render Docs**: https://render.com/docs
- **Django Docs**: https://docs.djangoproject.com
- **Celery Docs**: https://docs.celeryproject.io
- **PostgreSQL Docs**: https://www.postgresql.org/docs

---

## Still Stuck?

1. **Check Render logs** - This is 80% of debugging
2. **SSH into the service** - Run commands directly
3. **Test locally first** - Ensure code works before deploying
4. **Simplify** - Remove optional features to isolate issue
5. **Restart service** - Many issues resolve after restart

Good luck! 🚀
