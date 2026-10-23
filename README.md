# Bloomcare Home Services Platform

Bloomcare is a home-services booking platform for customers to discover local services, request a visit, and track booking progress. Staff users manage services and customer bookings through an admin dashboard.

## Technology

- Frontend: React 19.3.1, Vite 8.3.5, React Router, Axios 1.20.0
- Backend: Django 6.0.9, Django REST Framework 3.18.3, and Simple JWT 5.5.1
- Database: MySQL 8.0.41
- Authentication: JWT access and refresh tokens

## Project structure

```text
frontend/                 React/Vite application
backend/config/           Django settings and root API routes
backend/accounts/         Registration, JWT profile API, auth tests
backend/services/         Service catalog API, model and tests
backend/bookings/         Booking API, status workflow and tests
docs/architecture.md      Components and data flow
docs/workflow.md          Customer/admin workflow and API reference
```

## Local setup

### Requirements

- Python 3.13 and Node.js 24 with npm
- MySQL 8.0 or later, running locally
- The existing schema `home_services_db` and account `home_services_app` with required schema privileges

### MySQL database setup

If the local database and application account do not exist yet, create them in MySQL Workbench or the MySQL client. Replace the password placeholder locally with a strong, unique password; do not commit it or paste it into chat.

```sql
CREATE DATABASE home_services_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'home_services_app'@'127.0.0.1' IDENTIFIED BY 'replace-with-a-strong-unique-password';
GRANT ALL PRIVILEGES ON home_services_db.* TO 'home_services_app'@'127.0.0.1';
```

Create `backend/.env` from `backend/.env.example`, then set the local database password and a private Django secret key in that ignored file. Keep `DB_HOST=127.0.0.1` and `DB_PORT=3306` for local MySQL.

### Backend

From the repository root, open PowerShell and run:

```powershell
cd .\backend
.\.venv\Scripts\Activate.ps1
```

If the local virtual environment is not present, create one and install requirements:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Create `backend/.env` from `.env.example`, then enter the real local MySQL password only in `DB_PASSWORD` and set a private Django `SECRET_KEY`. Keep this file local; Git ignores it. Never paste its contents into chat or commit it.

```powershell
Copy-Item .env.example .env
```

Apply migrations and run the checks:

```powershell
python manage.py check
python manage.py migrate
python manage.py showmigrations
```

Create the first staff account when prompted. Type its password directly into the terminal; Django does not echo it:

```powershell
python manage.py createsuperuser
```

Run the API:

```powershell
python manage.py runserver 127.0.0.1:8000
```

### Frontend

In a second PowerShell window:

```powershell
cd .\frontend
Copy-Item .env.example .env
npm install
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://127.0.0.1:5173`). `VITE_API_BASE_URL` can point the frontend at another API host.

## API overview

All endpoints use the `/api/` prefix. JSON errors contain field-specific messages where possible.

| Method | Endpoint | Access | Purpose |
| --- | --- | --- | --- |
| POST | `/api/register/` | Public | Create a customer account |
| POST | `/api/token/` | Public | Exchange username/password for JWT tokens |
| POST | `/api/token/refresh/` | Public | Refresh an access token |
| GET | `/api/me/` | JWT | Read the signed-in user's profile and role |
| GET | `/api/services/` | Public | List active services |
| GET | `/api/services/{id}/` | Public | Read an active service |
| POST | `/api/services/` | Staff | Add a service |
| PATCH | `/api/services/{id}/` | Staff | Edit or activate/deactivate a service |
| POST | `/api/bookings/` | JWT | Request a service visit |
| GET | `/api/my-bookings/` | JWT | List only the signed-in user's bookings |
| GET | `/api/admin/bookings/` | Staff | List all customer bookings |
| PATCH | `/api/bookings/{id}/status/` | Staff | Move a booking to an allowed next status |

The Django admin site is available at `/admin/` for staff users.

## Tests and checks

The normal Django settings connect the application to MySQL. The automated API suite uses an isolated in-memory SQLite database so it does not require `CREATE DATABASE` permission and cannot alter local MySQL records:

```powershell
cd .\backend
.\.venv\Scripts\python.exe manage.py test accounts services bookings --settings=config.test_settings
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py migrate --check
```

Build and lint the React application from the frontend directory:

```powershell
cd .\frontend
npm run build
npm run lint
```

## Security notes

- Database credentials and the Django secret key are read from `backend/.env`.
- Public registration only creates ordinary customer users; it cannot grant staff access.
- The frontend keeps JWTs in `sessionStorage`, which clears when the browser tab session ends. JavaScript running on the same origin can still access these tokens, so preventing cross-site scripting remains important. A production deployment should consider a backend-for-frontend or secure HttpOnly cookie design.
- Logout removes the access and refresh tokens from the current browser session. Server-side refresh-token revocation is not configured, so a copied refresh token remains usable until it expires.
- Frontend route guards improve navigation only. The API independently enforces authentication, ownership, and staff permissions.
- `DEBUG` should be `False` and `ALLOWED_HOSTS`, CORS origins, HTTPS, secret management, and database credentials should be set for the production environment before deployment.

## Current implementation status

- MySQL connection and initial Django migrations: verified.
- Authentication, service catalog, and booking APIs: implemented; seven API tests pass.
- Responsive customer pages and staff dashboard: implemented; frontend build and lint pass.
- Local MySQL currently contains five sample services: four active for public browsing and one inactive to verify service availability rules. A staff account has been created locally. The frontend staff dashboard is `/admin` on the Vite host; Django's built-in admin is `/admin/` on the backend host.
- Deployment and GitHub publishing have not been performed.
- Fresh-clone installation has not been tested; project files are currently untracked in the local Git repository.

## Screenshots and demo

Capture real screenshots from the running application with the browser's screenshot tool. Suggested views are the home page, active service catalog, registration/login form, a successful booking and My bookings view, and the staff dashboard after signing in. Use sample data only and hide personal information before sharing screenshots. Do not fabricate screenshots or claim the dashboard was verified until a staff login succeeds.

### Five-to-eight-minute demo order

1. Introduce the React/Vite, Django REST Framework, and MySQL architecture (about 1 minute).
2. Show the home page and browse/filter the live service catalog (about 1 minute).
3. Register or sign in as a customer, create a future-dated booking, and show it in My bookings (about 2 minutes).
4. Sign in as staff, show service management and booking requests, then advance a booking through a permitted status (about 2 minutes; requires successful staff login).
5. Explain backend ownership/price enforcement, JWT refresh, validation, and the test suite (about 1 minute).

For interview discussion, describe authentication as proving a user's identity and authorization as checking what that user may manage. Django assigns booking ownership from the authenticated request, records the service price at booking time, and validates status transitions on the server. Django ORM migrations maintain the MySQL schema; API tests cover permissions, ownership, pricing, and booking workflow rules.