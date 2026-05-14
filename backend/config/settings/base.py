"""
Base settings for Dokiflux backend.
Shared between dev and production environments.
"""
import os
from pathlib import Path
from datetime import timedelta

from django.core.exceptions import ImproperlyConfigured
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent.parent

SECRET_KEY = config("DJANGO_SECRET_KEY", default="")
if not SECRET_KEY:
    if os.getenv("DJANGO_SETTINGS_MODULE", "").endswith(".prod"):
        raise ImproperlyConfigured("DJANGO_SECRET_KEY is required in production.")
    SECRET_KEY = "insecure-dev-only-change-me"

ALLOWED_HOSTS = config("ALLOWED_HOSTS", default="localhost,127.0.0.1", cast=Csv())

# --- Application definition ---

DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.humanize",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "django_filters",
    "drf_spectacular",
    "storages",
]

LOCAL_APPS = [
    "apps.users",
    "apps.projects",
    "apps.billing",
    "apps.generation",
    "apps.demo",
    "apps.marketing",
    "apps.stats",
]

# apps.stats debe ir antes que django.contrib.admin para que su override
# de admin/base_site.html (que añade el botón "📊 Stats") tenga prioridad.
INSTALLED_APPS = ["apps.stats"] + DJANGO_APPS + THIRD_PARTY_APPS + [
    a for a in LOCAL_APPS if a != "apps.stats"
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.generation.middleware.AsyncJWTAuthMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# --- Database ---

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": config("POSTGRES_DB", default="dokiflux"),
        "USER": config("POSTGRES_USER", default="dokiflux"),
        "PASSWORD": config("POSTGRES_PASSWORD", default="dokiflux"),
        "HOST": config("POSTGRES_HOST", default="db"),
        "PORT": config("POSTGRES_PORT", default="5432"),
    }
}

# --- Cache (Redis) ---

CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": config("REDIS_URL", default="redis://redis:6379/0"),
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
        },
    }
}

# --- Auth ---

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- REST Framework ---

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "apps.users.authentication.CookieJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": (
        "django_filters.rest_framework.DjangoFilterBackend",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {
        "anon_auth": "10/min",
        "resend_email": "3/min",
        "token_refresh": "20/min",
    },
}

# --- Simple JWT ---

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

# --- CORS ---

CORS_ALLOWED_ORIGINS = config(
    "CORS_ALLOWED_ORIGINS",
    default="http://localhost:3000",
    cast=Csv(),
)

# Allow Meta tracking headers from the frontend (event_id + _fbp/_fbc).
from corsheaders.defaults import default_headers as _default_cors_headers  # noqa: E402

CORS_ALLOW_HEADERS = list(_default_cors_headers) + [
    "x-meta-event-id",
    "x-meta-fbp",
    "x-meta-fbc",
]
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = config(
    "CSRF_TRUSTED_ORIGINS",
    default="http://localhost:3000",
    cast=Csv(),
)

# --- Spectacular (API docs) ---

SPECTACULAR_SETTINGS = {
    "TITLE": "Dokiflux API",
    "DESCRIPTION": "Backend API for Dokiflux — AI UI Generator SaaS",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# --- i18n ---

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# --- Static ---

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Email / Brevo ---

BREVO_API_KEY = config("BREVO_API_KEY", default="")
BREVO_SENDER_EMAIL = config("BREVO_SENDER_EMAIL", default="noreply@dokiflux.com")
BREVO_SENDER_NAME = config("BREVO_SENDER_NAME", default="Dokiflux")
CONTACT_EMAIL_TO = config("CONTACT_EMAIL_TO", default="")

# --- Google OAuth ---

GOOGLE_CLIENT_ID = config("GOOGLE_CLIENT_ID", default="")
GOOGLE_CLIENT_SECRET = config("GOOGLE_CLIENT_SECRET", default="")

# --- Dokiflux custom ---

AUTO_VERIFY_EMAIL = config("AUTO_VERIFY_EMAIL", default=False, cast=bool)
FRONTEND_URL = config("FRONTEND_URL", default="http://localhost:3000")

# --- AWS S3 / uploaded project assets ---

AWS_ACCESS_KEY_ID = config("AWS_ACCESS_KEY_ID", default="")
AWS_SECRET_ACCESS_KEY = config("AWS_SECRET_ACCESS_KEY", default="")
AWS_STORAGE_BUCKET_NAME = config("AWS_STORAGE_BUCKET_NAME", default="")
AWS_S3_REGION_NAME = config("AWS_S3_REGION_NAME", default="eu-west-1")
AWS_S3_CUSTOM_DOMAIN = config("AWS_S3_CUSTOM_DOMAIN", default="")
AWS_S3_ENDPOINT_URL = config("AWS_S3_ENDPOINT_URL", default="")
AWS_LOCATION = config("AWS_LOCATION", default="media")
AWS_DEFAULT_ACL = None
AWS_QUERYSTRING_AUTH = False
AWS_S3_FILE_OVERWRITE = False
AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=31536000, public"}

if AWS_STORAGE_BUCKET_NAME:
    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# --- Stripe ---

STRIPE_SECRET_KEY = config("STRIPE_SECRET_KEY", default="")
STRIPE_WEBHOOK_SECRET = config("STRIPE_WEBHOOK_SECRET", default="")
STRIPE_PREMIUM_PRICE_ID = config("STRIPE_PREMIUM_PRICE_ID", default="")
STRIPE_TOPUP_MIN_EUR = config("STRIPE_TOPUP_MIN_EUR", default=5, cast=int)

# --- AI Provider API Keys ---
# Single key (backward compat)
OPENAI_API_KEY = config("OPENAI_API_KEY", default="")
ANTHROPIC_API_KEY = config("ANTHROPIC_API_KEY", default="")
GEMINI_API_KEY = config("GEMINI_API_KEY", default="")

# Multi-key rotation (comma-separated, takes precedence over single key)
OPENAI_API_KEYS = [k.strip() for k in config("OPENAI_API_KEYS", default="").split(",") if k.strip()]
ANTHROPIC_API_KEYS = [k.strip() for k in config("ANTHROPIC_API_KEYS", default="").split(",") if k.strip()]
GEMINI_API_KEYS = [k.strip() for k in config("GEMINI_API_KEYS", default="").split(",") if k.strip()]

# --- Celery ---

CELERY_BROKER_URL = config("REDIS_URL", default="redis://redis:6379/0")
CELERY_RESULT_BACKEND = config("REDIS_URL", default="redis://redis:6379/0")
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "UTC"
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 600  # 10 minutes max per task

# --- Demo mode ---
DEMO_IP_SALT = config("DEMO_IP_SALT", default="")
DEMO_INITIAL_CREDITS = config("DEMO_INITIAL_CREDITS", default=2.0, cast=float)
DEMO_SIGNUP_BONUS_CREDITS = config("DEMO_SIGNUP_BONUS_CREDITS", default=3.0, cast=float)
DEMO_MAX_SESSIONS_PER_IP_24H = config("DEMO_MAX_SESSIONS_PER_IP_24H", default=0, cast=int)
DEMO_MAX_SESSIONS_PER_FP_24H = config("DEMO_MAX_SESSIONS_PER_FP_24H", default=1, cast=int)
# When True (defaults to DEBUG): disables IP/fingerprint quotas and refills
# demo credits on every /api/demo/start/ — lets you test the demo freely
# during development.
DEMO_DEV_MODE = config("DEMO_DEV_MODE", default=None, cast=lambda v: (str(v).lower() in ("1", "true", "yes")) if v is not None else None)
TRUSTED_PROXIES = config("TRUSTED_PROXIES", default="127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16", cast=Csv())

# --- Meta Ads (Pixel + Conversions API) ---
# Pixel/Dataset ID from Meta Events Manager. Used by both browser Pixel and CAPI.
META_PIXEL_ID = config("META_PIXEL_ID", default="")
# CAPI access token (server-side only — never expose to the browser).
META_CAPI_TOKEN = config("META_CAPI_TOKEN", default="")
# Optional: when set, events are flagged as test in Events Manager → Test Events.
META_CAPI_TEST_EVENT_CODE = config("META_CAPI_TEST_EVENT_CODE", default="")
