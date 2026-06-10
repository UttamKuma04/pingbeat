import os
from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / '.env')

SECRET_KEY = os.environ.get('SECRET_KEY', 'django-insecure-pingbeat-dev-key-change-in-production')

DEBUG = os.environ.get('DEBUG', 'False').lower() in ('true', '1', 'yes')

ALLOWED_HOSTS = [host.strip() for host in os.getenv("ALLOWED_HOSTS", "").split(",") if host.strip()]

CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS", ""
).split(",")
CSRF_TRUSTED_ORIGINS = [origin.strip() for origin in CSRF_TRUSTED_ORIGINS if origin.strip()]

CORS_ALLOWED_ORIGINS = os.getenv(
    "CORS_ALLOWED_ORIGINS", ""
).split(",")
CORS_ALLOWED_ORIGINS = [origin.strip() for origin in CORS_ALLOWED_ORIGINS if origin.strip()]

CORS_ALLOW_ALL_ORIGINS = False



INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sitemaps',
    # Third-party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_celery_beat',
    # Local apps
    'accounts',
    'monitoring',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'config.pingbeat_apm.PingBeatAPMMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


import dj_database_url


DATABASE_URL = os.environ.get('DATABASE_URL')
if DATABASE_URL:
    db_conn_max_age = int(os.environ.get('DB_CONN_MAX_AGE', '0' if DEBUG else '600'))
    DATABASES = {
        'default': dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=db_conn_max_age,
            ssl_require=os.environ.get('DB_SSL_REQUIRE', 'True').lower() in ('true', '1', 'yes')
        )
    }
    DATABASES['default']['CONN_HEALTH_CHECKS'] = True
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'pingbeat'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', 'postgres'),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }
    DATABASES['default']['CONN_HEALTH_CHECKS'] = True

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}

if not DEBUG:
    REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = (
        'rest_framework.renderers.JSONRenderer',
    )



SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}

GOOGLE_CLIENT_ID = os.environ.get(
    'GOOGLE_CLIENT_ID',
    '1091250855625-00rf2erbba7u9acaeapknl82p890jst4.apps.googleusercontent.com'
)


# CORS configuration handled dynamically at the top of the file




CELERY_BROKER_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = CELERY_BROKER_URL

# Django cache backend – uses the same Redis instance, DB 1 to avoid key collisions
_redis_url = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': _redis_url,
        'OPTIONS': {
            'db': 1,
        },
        'KEY_PREFIX': 'pingbeat',
        'TIMEOUT': 300,  # default 5 minutes; individual cache.set() calls override this
    }
}
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True

# Robust connection parameters for remote/free Redis (Render, etc.)
CELERY_BROKER_TRANSPORT_OPTIONS = {
    'health_check_interval': 10,
    'visibility_timeout': 3600,
    'socket_timeout': 30,
    'socket_connect_timeout': 30,
    'retry_on_timeout': True,
}
CELERY_RESULT_BACKEND_TRANSPORT_OPTIONS = {
    'health_check_interval': 10,
    'socket_timeout': 30,
    'socket_connect_timeout': 30,
    'retry_on_timeout': True,
}

CELERY_REDIS_SOCKET_TIMEOUT = 30
CELERY_REDIS_SOCKET_CONNECT_TIMEOUT = 30
CELERY_REDIS_SOCKET_KEEPALIVE = True

if CELERY_BROKER_URL.startswith('rediss://'):
    import ssl
    CELERY_BROKER_USE_SSL = {
        'ssl_cert_reqs': ssl.CERT_NONE
    }
    CELERY_REDIS_BACKEND_USE_SSL = {
        'ssl_cert_reqs': ssl.CERT_NONE
    }
    # Also configure the Django cache backend for TLS Redis
    CACHES['default']['OPTIONS']['ssl_cert_reqs'] = ssl.CERT_NONE


# Internationalization

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True


STATIC_URL = 'static/'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
DEFAULT_FROM_EMAIL = os.environ.get('BREVO_SENDER_EMAIL', 'alerts@pingbeat.com')

BREVO_API_KEY = os.environ.get('BREVO_API_KEY')
BREVO_SENDER_EMAIL = os.environ.get('BREVO_SENDER_EMAIL')
BREVO_SENDER_NAME = os.environ.get('BREVO_SENDER_NAME', 'Pingbeat')


# PingBEAT self-APM SDK integration. The middleware is loaded but remains a no-op
# until an API key is provided through the environment.
PINGBEAT_APM_API_KEY = os.environ.get('PINGBEAT_APM_API_KEY', os.environ.get('PINGBEAT_API_KEY', ''))
PINGBEAT_APM_INGEST_URL = os.environ.get('PINGBEAT_APM_INGEST_URL', 'http://localhost:8000/api/apm/ingest/')
PINGBEAT_APM_FLUSH_INTERVAL_SECONDS = int(os.environ.get('PINGBEAT_APM_FLUSH_INTERVAL_SECONDS', '30'))
PINGBEAT_APM_MAX_BATCH_SIZE = int(os.environ.get('PINGBEAT_APM_MAX_BATCH_SIZE', '500'))
PINGBEAT_APM_TIMEOUT_SECONDS = int(os.environ.get('PINGBEAT_APM_TIMEOUT_SECONDS', '5'))
PINGBEAT_APM_SYNC_INGEST = os.environ.get(
    'PINGBEAT_APM_SYNC_INGEST',
    'True' if DEBUG else 'False'
).lower() in ('true', '1', 'yes')
PINGBEAT_APM_LOCAL_CAPTURE = os.environ.get(
    'PINGBEAT_APM_LOCAL_CAPTURE',
    'True' if DEBUG else 'False'
).lower() in ('true', '1', 'yes')
PINGBEAT_APM_EXCLUDED_PATHS = tuple(
    path.strip()
    for path in os.environ.get(
        'PINGBEAT_APM_EXCLUDED_PATHS',
        '/api/apm/ingest/,/admin/,/static/',
    ).split(',')
    if path.strip()
)
APM_INGEST_RATE_LIMIT = int(os.environ.get('APM_INGEST_RATE_LIMIT', '60'))
APM_METRIC_RETENTION_DAYS = int(os.environ.get('APM_METRIC_RETENTION_DAYS', '7'))
APM_SLOW_ENDPOINT_THRESHOLD_MS = int(os.environ.get('APM_SLOW_ENDPOINT_THRESHOLD_MS', '2000'))
