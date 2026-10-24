# Production release preparation

This project uses manually configured Render services. It does not include a Render Blueprint, Dockerfile, or Procfile.

## Render start command

For the `bloomcare-api` web service, set the Start Command to:

```sh
cd backend && bash start.sh
```

`backend/start.sh` collects static files and starts Gunicorn. It never runs migrations. The Render Dashboard currently has a different start command that includes `migrate --noinput`; update that setting manually before the next API deployment. This file does not change the live Render service by itself.

## Render environment values to verify

Set these on the backend service without copying local `.env` contents into Git:

- `DEBUG=False`
- `ALLOWED_HOSTS=bloomcare-api-is83.onrender.com`
- `CORS_ALLOWED_ORIGINS=https://bloomcare-frontend.onrender.com`
- `CSRF_TRUSTED_ORIGINS=https://bloomcare-api-is83.onrender.com,https://bloomcare-frontend.onrender.com`
- `SECURE_HSTS_SECONDS=3600` to begin with; increase only after HTTPS behavior is confirmed
- `SECRET_KEY` and the Aiven database variables, entered from their trusted sources
- `DB_SSL_CA` must name a CA certificate file that actually exists in the Render runtime

Render sets `RENDER_EXTERNAL_HOSTNAME` for the API service; Django adds it to `ALLOWED_HOSTS`. Verify the service's actual value in Render rather than copying it from local settings.

Set this on the frontend static site before its build:

```text
VITE_API_BASE_URL=https://bloomcare-api-is83.onrender.com/api
```

Vite embeds this value in the generated client bundle at build time.

## Explicit migration procedure

The current API service is on Render Free, which does not provide Dashboard Shell or pre-deploy commands. Do not put `migrate` in `start.sh`, the normal Start Command, or a routine build command.

1. Verify an Aiven restore point and make a separate logical backup.
2. Restore a sanitized production snapshot to an isolated MySQL 8 staging service.
3. Against staging, inspect migration history and plan, generate MySQL SQL, apply the additive migrations, and compare important row counts and relationships.
4. After staging passes, arrange an explicit migration-capable Render execution context, such as temporarily moving the API to a paid plan for a Dashboard Shell/pre-deploy command or using an explicitly launched one-off job. Confirm its environment points at the intended database before running anything.
5. In that controlled context, review `python manage.py migrate --plan`, then run `python manage.py migrate --noinput` only after backup and release approval.
6. Verify existing customer, service, and booking records before exposing the updated frontend.

If there is no paid/one-off execution context or MySQL staging, stop the release. Do not substitute an automatic migration at application startup.
