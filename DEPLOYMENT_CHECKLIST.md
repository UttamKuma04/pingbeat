# 🚀 PingBEAT Render Deployment Checklist

## Pre-Deployment Checklist

- [ ] Code pushed to GitHub (`main` branch)
- [ ] `.env` file removed from git history
- [ ] All environment variables configured locally and tested
- [ ] Frontend builds successfully: `npm run build`
- [ ] Backend migrations run: `python manage.py migrate`
- [ ] Tests pass locally (if applicable)

## Deployment Method: Choose One

### Option A: Manual Deployment (Recommended First Time)

Follow [RENDER_DEPLOYMENT.md](./RENDER_DEPLOYMENT.md) step by step.

**Time: ~30 minutes**

### Option B: Using render.yaml (One-Click)

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repo
4. Select `render.yaml` file
5. Review and deploy

**Time: ~5 minutes (auto-configures everything)**

## Step-by-Step Quick Reference

### 1. Create Database (5 min)
```
Render Dashboard → New → PostgreSQL
Name: pingbeat-postgres
Database: pingbeat
Keep the Internal URL for later
```

### 2. Create Redis (3 min)
```
Render Dashboard → New → Redis
Name: pingbeat-redis
Keep the Internal URL for later
```

### 3. Deploy Backend (10 min)
```
Render Dashboard → New → Web Service
GitHub Repo: Your PingBEAT repo
Build: pip install -r requirements.txt
Start: cd backend && python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT

Environment Variables:
DATABASE_URL=<from PostgreSQL>
REDIS_URL=<from Redis>
DEBUG=False
SECRET_KEY=<generate random>
ALLOWED_HOSTS=*.render.com
```

### 4. Deploy Celery Worker (5 min)
```
Render Dashboard → New → Background Worker
Build: pip install -r requirements.txt
Start: cd backend && celery -A config worker --loglevel=info

Environment Variables: (same as backend)
```

### 5. Deploy Celery Beat (5 min)
```
Render Dashboard → New → Background Worker
Build: pip install -r requirements.txt
Start: cd backend && celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler

Environment Variables: (same as backend)
```

### 6. Deploy Frontend (5 min)
```
Render Dashboard → New → Static Site
Build: npm install && npm run build
Publish: dist

Environment Variables:
VITE_API_URL=https://pingbeat-backend.onrender.com/api
```

### 7. Post-Deploy Setup (5 min)

```bash
# SSH into Backend service or use Render Shell
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

## After Deployment

### Verify Services Are Running

| Service | Check URL |
|---------|-----------|
| Frontend | `https://pingbeat-frontend.onrender.com` |
| Backend | `https://pingbeat-backend.onrender.com/api/` |
| Admin | `https://pingbeat-backend.onrender.com/admin/` |

### Test the Application

1. Open Frontend URL
2. Register new account
3. Login
4. Create a monitor
5. Wait 1-2 minutes
6. Check if monitor shows results

### Monitor Service Health

```
Render Dashboard → Each Service → Metrics
Check: CPU, Memory, Disk
Expected: Low usage during idle
```

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| `502 Bad Gateway` | Check Backend logs, verify DATABASE_URL |
| `Can't connect to database` | Verify DATABASE_URL, check PostgreSQL is running |
| `Redis connection timeout` | Verify REDIS_URL, restart Redis instance |
| `CORS errors in frontend` | Add frontend domain to ALLOWED_HOSTS |
| `Celery tasks not running` | Check Celery logs, verify REDIS_URL |
| `Frontend blank/404` | Check build output, verify build command |
| `No migrations run` | SSH in and manually run `python manage.py migrate` |

## Environment Variables Needed

### Backend (Critical)
```
DATABASE_URL=postgresql://user:pass@host/db
REDIS_URL=redis://host:6379/0
SECRET_KEY=<random-secret>
DEBUG=False
ALLOWED_HOSTS=*.render.com
```

### Backend (Optional - Email Alerts)
```
BREVO_API_KEY=<your-key>
BREVO_SENDER_EMAIL=alerts@domain.com
BREVO_SENDER_NAME=PingBEAT
PINGBEAT_APM_API_KEY=pb_<generated-key>
```

### Frontend
```
VITE_API_URL=https://backend-url/api
```

## How to Generate SECRET_KEY

### On Windows (PowerShell):
```powershell
$bytes = New-Object Byte[] 32; $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new(); $rng.GetBytes($bytes); -join ($bytes | ForEach-Object { '{0:x2}' -f $_ })
```

### On macOS/Linux:
```bash
openssl rand -hex 32
```

Or use any random string generator online: https://www.random.org/strings/

## Cost Notes

- **PostgreSQL Starter**: Free tier or $15+/month
- **Redis Starter**: Free tier or $10+/month
- **Backend Service**: $7 minimum
- **Celery Workers**: $7+ each
- **Frontend**: Free (static)

**Estimated Total**: $20-50/month depending on tier

## Scale Later

Once running, you can:
- Upgrade to higher database plans for more connections
- Add more Celery workers for parallel processing
- Switch frontend to paid tier for custom domain
- Enable Redis backups for persistence

## Support & Resources

- [Render Documentation](https://render.com/docs)
- [Django Deployment](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Celery Documentation](https://docs.celeryproject.io/)

## Deployment Complete! ✅

Your PingBEAT is now live. Next steps:
1. Create monitors to track your services
2. Set up alerts for status changes
3. Monitor the monitoring system itself!
