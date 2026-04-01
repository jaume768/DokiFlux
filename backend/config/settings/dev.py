"""
Development settings for Dokiflux backend.
"""
from .base import *  # noqa: F401, F403

DEBUG = True

# AUTO_VERIFY_EMAIL is read from .env via base.py — do not override here

# In development, log emails to console instead of sending
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
