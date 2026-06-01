# 🚀 PingBEAT Deployment Guide for Render

Complete step-by-step guide to deploy PingBEAT frontend and backend on Render.

## Prerequisites

- GitHub repository (push your code to GitHub first)
- Render.com account (https://render.com)
- Git CLI installed
- Credit card for Render (some services are free, others paid)

## Step 1: Prepare Your Repository

Before deploying, ensure your `.env` file is **NOT** committed to git:

```bash
git status
# Should NOT show backend/.env
```

If `.env` is in git history, remove it:
```bash
git rm --cached backend/.env
git commit -m "Remove .env from tracking"
git push origin main
```

## Step 2: Create PostgreSQL Database on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → Select **"PostgreSQL"**
3. Fill in details:
   - **Name**: `pingbeat-postgres`
   - **Database**: `pingbeat`
   - **User**: `pingbeat_user`
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: 16
4. Click **"Create Database"**
5. Wait 2-3 minutes for database to start
6. Copy the **Internal Database URL** (starts with `postgresql://`)

## Step 3: Create Redis Instance on Render

1. Click **"New +"** → Select **"Redis"**
2. Fill in details:
   - **Name**: `pingbeat-redis`
   - **Region**: Same as PostgreSQL
   - **Redis Version**: 7
3. Click **"Create Redis"**
4. Wait 1-2 minutes
5. Copy the **Internal Redis URL** (starts with `redis://`)

## Step 4: Deploy Backend on Render

### 4.1 Create Web Service

1. Click **"New +"** → Select **"Web Service"**
2. Connect your GitHub repo (authorize if needed)
3. Select your PingBEAT repository
4. Fill in details:
   - **Name**: `pingbeat-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: 
     ```
     cd backend && python manage.py migrate && gunicorn config.wsgi:application --bind 0.0.0.0:$PORT
     ```
   - **Region**: Same as database
   - **Plan**: `Standard` (or `Pro` if needed)
5. Click **"Create Web Service"**

### 4.2 Add Environment Variables

In the Backend service settings, go to **"Environment"** and add:

```env
DATABASE_URL=<paste Internal Database URL from Step 2>
REDIS_URL=<paste Internal Redis URL from Step 3>
DEBUG=False
SECRET_KEY=<generate a random string like: django-insecure-$(openssl rand -hex 32)>
ALLOWED_HOSTS=*.render.com,yourdomain.com
BREVO_API_KEY=<your Brevo API key if using email alerts>
BREVO_SENDER_EMAIL=<your email>
BREVO_SENDER_NAME=PingBEAT
PINGBEAT_APM_API_KEY=pb_<generate-random-key>
PINGBEAT_APM_INGEST_URL=<will be set after deployment>
```

### 4.3 Deploy

Render will automatically build and deploy. Wait for green checkmark (5-10 minutes).

Once deployed:
- Note your Backend URL: `https://pingbeat-backend.onrender.com`
- Update `PINGBEAT_APM_INGEST_URL` to: `https://pingbeat-backend.onrender.com/api/apm/ingest/`

## Step 5: Deploy Celery Worker on Render

### 5.1 Create Background Worker

1. Click **"New +"** → Select **"Background Worker"**
2. Connect same GitHub repo
3. Fill in details:
   - **Name**: `pingbeat-celery`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: 
     ```
     cd backend && celery -A config worker --loglevel=info
     ```
4. Add same environment variables as backend
5. Click **"Create Background Worker"**

### 5.2 Create Celery Beat (Scheduler)

1. Click **"New +"** → Select **"Background Worker"**
2. Connect same GitHub repo
3. Fill in details:
   - **Name**: `pingbeat-celery-beat`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: 
     ```
     cd backend && celery -A config beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
     ```
4. Add same environment variables as backend
5. Click **"Create Background Worker"**

## Step 6: Deploy Frontend on Render

### 6.1 Create Static Site Service

1. Click **"New +"** → Select **"Static Site"**
2. Connect GitHub repo
3. Fill in details:
   - **Name**: `pingbeat-frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
   - **Region**: Same as backend
4. Click **"Create Static Site"**

### 6.2 Configure Environment Variables

In Frontend service, go to **"Environment"** and add:

```env
VITE_API_URL=https://pingbeat-backend.onrender.com/api
```

Render will automatically rebuild. Wait for deployment (3-5 minutes).

Once deployed:
- Your frontend URL: `https://pingbeat-frontend.onrender.com`

## Step 7: Post-Deployment Setup

### 7.1 Run Database Migrations

Connect to backend via Render shell or SSH:

```bash
# Via Render Dashboard: Click Backend → Logs → Shell
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

### 7.2 Verify Services

- **Frontend**: https://pingbeat-frontend.onrender.com
- **Backend API**: https://pingbeat-backend.onrender.com/api/
- **Admin Panel**: https://pingbeat-backend.onrender.com/admin/
- **Health Check**: https://pingbeat-backend.onrender.com/api/health/

### 7.3 Test Application

1. Open frontend URL
2. Register a new account
3. Login
4. Create a monitor
5. Check if monitoring works (logs should appear after ~1-2 minutes)

## Step 8: Configure Domain (Optional)

For custom domain:

1. Go to Frontend service settings
2. Click **"Custom Domains"**
3. Add your domain (e.g., `pingbeat.yourdomain.com`)
4. Update DNS records as instructed by Render
5. Update Backend's `ALLOWED_HOSTS` to include your domain

## Environment Variables Reference

### Backend Required
```
DATABASE_URL          - PostgreSQL connection string
REDIS_URL            - Redis connection string
SECRET_KEY           - Django secret (keep secret!)
DEBUG                - False in production
```

### Backend Optional
```
BREVO_API_KEY        - For email alerts
BREVO_SENDER_EMAIL   - Sender email address
PINGBEAT_APM_API_KEY - For self-monitoring
```

### Frontend
```
VITE_API_URL         - Backend API URL
```

## Troubleshooting

### Services Won't Start

**Check logs:**
- Render Dashboard → Service → Logs

**Common issues:**
- Database URL incorrect → Verify `DATABASE_URL` 
- Redis URL incorrect → Verify `REDIS_URL`
- Missing migrations → SSH in and run `python manage.py migrate`
- Port already in use → Render handles this, restart service

### Celery Worker Not Running

```bash
# Check if redis is accessible
redis-cli -u $REDIS_URL ping

# Check worker logs
celery -A config worker --loglevel=debug
```

### Frontend Can't Connect to Backend

```
CORS Error → Verify ALLOWED_HOSTS includes frontend domain
SSL Issues → Both must be HTTPS on production
```

### Database Connection Issues

```
SSL Certificate → Render's PostgreSQL uses SSL by default
Add to DATABASE_URL → ?sslmode=require
```

## Cost Estimation

| Service | Plan | Cost/Month |
|---------|------|-----------|
| PostgreSQL | Starter | Free → $15+ |
| Redis | Starter | Free → $10+ |
| Backend | Standard | $7 → $25+ |
| Frontend | Static | Free |
| Celery Worker | Background | $7+ each |
| **Total** | | **$21+** |

*Prices vary by region and traffic. Check Render pricing page.*

## Monitoring & Maintenance

### Enable Render Notifications
1. Dashboard → Settings → Notifications
2. Enable email/Slack for deployment failures

### Monitor Resource Usage
1. Each service → Metrics tab
2. Check CPU, memory, bandwidth

### Regular Backups
1. Database → Backups tab
2. Configure automatic backups

### Update Dependencies
Regularly update your requirements.txt:
```bash
pip list --outdated
pip install --upgrade <package>
pip freeze > backend/requirements.txt
git commit -am "Update dependencies"
git push
```

## Next Steps

- ✅ Monitor your deployment in Render dashboard
- ✅ Set up email alerts in Brevo
- ✅ Configure custom domain
- ✅ Set up uptime monitoring for PingBEAT itself
- ✅ Review security settings in Django admin

## Support

For issues:
- Check Render docs: https://render.com/docs
- Django docs: https://docs.djangoproject.com
- React/Vite docs: https://vitejs.dev
