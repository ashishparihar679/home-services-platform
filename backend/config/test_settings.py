"""Isolated settings for automated tests; the application still uses MySQL."""

from .settings import *  # noqa: F403

# Avoid requiring CREATE DATABASE privileges or touching the developer's MySQL data.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}
