from pathlib import Path
import os
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables (.env.local, .env from backend and project root)
for env_path in [
    BASE_DIR.parent / ".env.local",
    BASE_DIR / ".env.local",
    BASE_DIR / ".env",
    BASE_DIR.parent / ".env",
]:
    if env_path.exists():
        load_dotenv(env_path)

# =========================
# SECURITY
# =========================
DEBUG = os.environ.get("DEBUG", "True") == "True"

SECRET_KEY = os.environ.get("SECRET_KEY")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("CRITICAL SECURITY ERROR: SECRET_KEY environment variable is missing in production!")
    SECRET_KEY = "dev-secret-key-unsafe-change-in-prod"

raw_hosts = os.environ.get(
    "ALLOWED_HOSTS",
    "127.0.0.1,localhost,localhost:5173,127.0.0.1:5173,localhost:3000,127.0.0.1:3000,aidepressionproject.onrender.com,staging-api.soulcare.app,api.soulcare.app,testserver"
)
ALLOWED_HOSTS = [h.strip() for h in raw_hosts.split(",") if h.strip()]

# Add FRONTEND_URL and BACKEND_URL domain hosts if provided via environment
frontend_url = os.environ.get("FRONTEND_URL", "").strip()
if frontend_url:
    from urllib.parse import urlparse
    parsed_fe = urlparse(frontend_url).netloc or urlparse(frontend_url).path
    if parsed_fe and parsed_fe not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(parsed_fe)

backend_url = os.environ.get("BACKEND_URL", "").strip()
if backend_url:
    from urllib.parse import urlparse
    parsed_be = urlparse(backend_url).netloc or urlparse(backend_url).path
    if parsed_be and parsed_be not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(parsed_be)

# Trust proxy for HTTPS detection
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Production security headers (only when DEBUG=False)
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True

raw_csrf = os.environ.get(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,https://aidepressionproject.onrender.com,https://staging-api.soulcare.app,https://api.soulcare.app"
)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in raw_csrf.split(",") if o.strip()]
if frontend_url and frontend_url not in CSRF_TRUSTED_ORIGINS:
    CSRF_TRUSTED_ORIGINS.append(frontend_url)

# =========================
# APPLICATIONS
# =========================
INSTALLED_APPS = [
    'daphne',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'channels',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',

    # JWT blacklist (for logout)
    'rest_framework_simplejwt.token_blacklist',

    # Domain apps
    'apps.authentication',
    'apps.identity',
    'apps.journal',
    'apps.insights',
    'apps.support',
    'apps.chat',
    'apps.telemetry',
    'apps.community',

    # Web frontend
    'web',
]

SITE_ID = 1

# =========================
# MIDDLEWARE
# =========================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'config.urls'

# =========================
# TEMPLATES
# =========================
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
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

STATIC_URL = '/static/'
STATICFILES_DIRS = []
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# =========================
# DATABASE
# =========================
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    import dj_database_url
    # When connecting to a pooled PgBouncer endpoint (e.g. Neon -pooler),
    # set conn_max_age to 0 to avoid stale serverless transaction pool connections.
    is_pooled = "pooler" in DATABASE_URL
    DATABASES = {
        "default": dj_database_url.parse(
            DATABASE_URL,
            conn_max_age=0 if is_pooled else 600,
            conn_health_checks=True,
        )
    }
else:
    DB_ENGINE = os.environ.get("DB_ENGINE", "postgresql")
    if DB_ENGINE == "postgresql" and os.environ.get("DB_NAME"):
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": os.environ.get("DB_NAME", "soulcare_db"),
                "USER": os.environ.get("DB_USER", "postgres"),
                "PASSWORD": os.environ.get("DB_PASSWORD", "postgres"),
                "HOST": os.environ.get("DB_HOST", "localhost"),
                "PORT": os.environ.get("DB_PORT", "5432"),
                "CONN_MAX_AGE": 600,
                "CONN_HEALTH_CHECKS": True,
            }
        }
    else:
        DATABASES = {
            "default": {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": BASE_DIR / "db.sqlite3",
                "CONN_MAX_AGE": 600,
                "CONN_HEALTH_CHECKS": True,
            }
        }

# =========================
# AUTH
# =========================
AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# =========================
# DRF & SECURITY THROTTLING
# =========================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/minute',
        'user': '100/minute',
        'ai_generation': '20/minute',
        'password_reset': '5/hour',
        'community_post': '10/day',
    },
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'EXCEPTION_HANDLER': 'config.exceptions.custom_exception_handler',
}

from datetime import timedelta
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=30),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# =========================
# CORS
# =========================
CORS_ALLOW_ALL_ORIGINS = DEBUG
raw_cors = os.environ.get("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [c.strip() for c in raw_cors.split(",") if c.strip()]
if frontend_url and frontend_url not in CORS_ALLOWED_ORIGINS:
    CORS_ALLOWED_ORIGINS.append(frontend_url)

# =========================
# GOOGLE OAUTH
# =========================
# Must be set to the Web client ID from Google Cloud Console for Sign-In to work.
# When empty, /api/auth/google/ fails closed (503) instead of accepting tokens it
# cannot verify the audience of.
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "").strip()

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
    }
}

# =========================
# CHANNELS / REDIS
# =========================
ASGI_APPLICATION = "config.asgi.application"

REDIS_URL = os.environ.get("REDIS_URL", "").strip()

if REDIS_URL and not REDIS_URL.startswith("redis://127.0.0.1") and not REDIS_URL.startswith("redis://localhost"):
    is_tls = REDIS_URL.startswith("rediss://")
    host_config = {
        "address": REDIS_URL,
        "socket_connect_timeout": 5,
        "socket_timeout": 5,
        "retry_on_timeout": True,
        "health_check_interval": 30,
    }
    if is_tls:
        import ssl
        host_config["ssl_cert_reqs"] = ssl.CERT_NONE

    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "apps.chat.channel_layer.ResilientChannelLayer",
            "CONFIG": {
                "hosts": [host_config],
                "capacity": 1500,
                "expiry": 10,
            },
        },
    }
else:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels.layers.InMemoryChannelLayer",
        },
    }

# =========================
# MISC
# =========================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# =========================
# EMAIL (password reset)
# =========================
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'True') == 'True'
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')
_raw_from = os.environ.get('DEFAULT_FROM_EMAIL', EMAIL_HOST_USER)
if _raw_from and not _raw_from.startswith("SoulCare"):
    DEFAULT_FROM_EMAIL = f"SoulCare <{_raw_from}>"
else:
    DEFAULT_FROM_EMAIL = _raw_from or "SoulCare <noreply@soulcare.app>"

# =========================
# LOGGING (Staging & Production)
# =========================
LOGS_DIR = BASE_DIR / 'logs'
LOGS_DIR.mkdir(parents=True, exist_ok=True)

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [{name}:{lineno}] {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
        'file_error': {
            'level': 'ERROR',
            'class': 'logging.FileHandler',
            'filename': LOGS_DIR / 'staging_error.log',
            'formatter': 'verbose',
        },
        'file_request': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': LOGS_DIR / 'staging_request.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file_error'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.request': {
            'handlers': ['console', 'file_request', 'file_error'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console', 'file_error', 'file_request'],
            'level': 'INFO',
            'propagate': False,
        },
        'config': {
            'handlers': ['console', 'file_error'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

