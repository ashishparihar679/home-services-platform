# Bloomcare Home Services Platform

Bloomcare is a home-services booking platform. Customers browse local services, request appointments, and track booking status. Workers apply to join, manage their availability, and respond to assigned jobs. Staff manage the service catalog, worker applications, and bookings.

## Technology

- Frontend: React 19, Vite 8, React Router, Axios, React Toastify
- Backend: Django 6, Django REST Framework, Simple JWT
- Database: MySQL
- Authentication: JWT access and refresh tokens
- UI: permanent dark theme with responsive pages and an interactive 3D service carousel

See [docs/architecture.md](docs/architecture.md) for component/data flow and [docs/workflow.md](docs/workflow.md) for role workflows and booking status transitions.

## Repository layout

```text
frontend/
  src/api/                 Axios API client
  src/components/          Shared navigation, layout, carousel and cards
  src/context/             Authentication state
  src/pages/                Home, services, booking, account and role dashboards
  src/utils/                Authentication and notification helpers
backend/
  config/                   Django settings, authentication and root URLs
  accounts/                 Registration, worker applications and profiles
  services/                 Service catalog API and models
  bookings/                 Customer bookings, worker jobs and staff workflows
docs/                       Architecture, workflow and production release notes
```

## Local development

### Prerequisites

- Python compatible with Django 6
- Node.js compatible with Vite 8 and npm
- MySQL 8 or later

### Configure the backend

In PowerShell from the repository root:

```powershell
cd .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `backend/.env` locally. Set a private `SECRET_KEY` and the MySQL `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`. The example defaults are for local MySQL; create the database and restricted application account if needed. Never commit `.env` or share its contents.

Run migrations and start the API:

```powershell
python manage.py check
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 127.0.0.1:8000
```

Create a superuser once for local staff testing; skip that command if you already have a staff account. The built-in Django admin is available at the backend host's `/admin/`.

### Configure the frontend

Open a second PowerShell window from the repository root:

```powershell
cd .\frontend
npm install
Copy-Item .env.example .env
npm run dev
```

The Vite development URL is printed in the terminal (usually `http://localhost:5173`). `VITE_API_BASE_URL` defaults to `http://127.0.0.1:8000/api`; update the local `frontend/.env` if the API runs elsewhere. Vite reads this variable during build.

### Frontend scripts

Run from `frontend/`:

```powershell
npm run dev       # Start the Vite development server
npm run build     # Create the production bundle in dist/
npm run preview   # Preview the production bundle locally
npm run lint      # Run Oxlint
```

### Backend checks

Run from `backend/`, with the virtual environment active:

```powershell
python manage.py check
python manage.py migrate --check
python manage.py test accounts services bookings --settings=config.test_settings
```

The project's test settings use isolated SQLite rather than the configured MySQL database. Normal development settings use the MySQL values in `backend/.env`.

## API overview

All application API routes use `/api/`. Protected endpoints require `Authorization: Bearer <access-token>`. Public service catalog requests return active services; write permissions and record ownership are enforced by Django.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/register/` | Public | Register a customer |
| POST | `/api/token/` | Public | Obtain JWT access and refresh tokens |
| POST | `/api/token/refresh/` | Public | Refresh an access token |
| GET | `/api/me/` | JWT | Read current account and role |
| GET | `/api/services/` | Public | List active services |
| GET | `/api/services/{id}/` | Public | Read a service |
| POST/PATCH | `/api/services/`, `/api/services/{id}/` | Staff | Create or manage catalog entries |
| POST | `/api/worker/apply/` | JWT | Submit a worker application |
| GET/PATCH | `/api/worker/profile/` | Worker | Read or update worker profile |
| GET | `/api/services/{id}/available-workers/` | JWT | List eligible workers for a service |
| POST | `/api/bookings/` | Customer JWT | Request a service booking |
| GET | `/api/my-bookings/` | Customer JWT | List own bookings |
| POST | `/api/my-bookings/{id}/cancel/` | Customer JWT | Cancel an eligible own booking |
| GET | `/api/admin/bookings/` | Staff | Review booking requests |
| PATCH | `/api/admin/bookings/{id}/assignment/` | Staff | Assign an eligible worker |
| PATCH | `/api/bookings/{id}/status/` | Staff | Update a booking status |
| GET | `/api/worker/jobs/` | Worker JWT | List assigned jobs |
| PATCH | `/api/worker/jobs/{id}/response/` | Assigned worker | Accept or decline a job |
| PATCH | `/api/worker/jobs/{id}/progress/` | Assigned worker | Update job progress |
| GET | `/api/admin/workers/` | Staff | Review worker applications |
| PATCH | `/api/admin/workers/{id}/` | Staff | Update worker approval/profile status |
| GET | `/api/super/analytics/` | Superuser | Read platform analytics |

Consult the Django route files for the supported methods and request payload fields: `backend/accounts/urls.py`, `backend/services/urls.py`, and `backend/bookings/urls.py`.

## Booking and worker behavior

- Customer bookings are linked to the authenticated customer; the API does not trust a submitted customer ID or client-side price.
- The booking records the service price at booking time.
- Worker applications are reviewed by staff. Worker eligibility depends on approval, availability, and matching service skills.
- A staff member can assign an eligible worker. The assigned worker responds to the job and updates supported progress states.
- The API validates status transitions and permissions. See [docs/workflow.md](docs/workflow.md) for the documented workflow.

## Database migrations

Booking migrations currently include `0001_initial`, `0002_booking_assignment_status_booking_worker`, `0003_booking_preferred_worker`, and `0004_booking_contact_phone`. Apply migrations to a local development database with `python manage.py migrate` after configuring `.env`.

Production migration status must be checked against the production database; repository files alone do not prove a migration was applied. Follow [docs/production-release.md](docs/production-release.md) for the staged backup and release procedure. Do not run migrations from the web service startup command or reverse a migration without reviewing dependencies and data impact.

## Deployment notes

The repository documents manually configured Render services and does not currently define a Render Blueprint. For the backend start command and required environment values, consult [docs/production-release.md](docs/production-release.md). Keep secrets in the Render environment settings, not in Git. Pushing a commit does not prove that a Render build, deployment, or production migration has completed; check the relevant service's deployment history and health separately.

## Security

- Keep `backend/.env`, production credentials, and private keys out of Git.
- Use `DEBUG=False`, correct `ALLOWED_HOSTS`, CORS/CSRF origins, HTTPS, and a valid database CA setting in production.
- The API enforces authentication, role permissions, customer ownership, and worker assignment rules. Frontend route guards are not a substitute for API checks.
- JWTs are kept in browser `sessionStorage`; JavaScript on the same origin can access them. Protect the frontend from cross-site scripting and review token storage requirements for your deployment.
