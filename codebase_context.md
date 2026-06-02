# PingBEAT Codebase Context Logfile

This file contains a comprehensive overview of the **PingBEAT** codebase structure, technology stack, backend APIs, celery tasks, and frontend components to facilitate easy onboarding/context loading for future tasks without needing to reread the entire codebase.

---

## 🛠️ Technology Stack

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React 18 + Vite + TailwindCSS | Core UI, routing via `react-router-dom`, requests via `axios` |
| **Backend** | Django 5 + Django REST Framework (DRF) | REST API endpoints, JWT authentication (`simplejwt`) |
| **Database** | PostgreSQL | Core application state, monitors, logs, status pages, incidents, APM raw metrics, and APM summaries |
| **Task Queue** | Redis 7 + Celery + Celery Beat | Asynchronous monitor probes every 30s, notifications, log cleanup, and APM aggregation |
| **APM SDK** | Lightweight Django middleware + ingest API | Captures endpoint, method, status code, response time, request count, and timestamps in batches |

---

## 📂 Codebase Directory Structure

```
PinBEAT/
├── backend/
│   ├── config/              # Django core configuration, URLs, and Celery settings
│   │   ├── celery.py        # Periodic check schedules (checks every 30s)
│   │   ├── settings.py      # Environment variables, installed apps, simplejwt configs
│   │   └── urls.py          # Primary api router configuration
│   ├── accounts/            # User authentication & registration app
│   │   ├── serializers.py   # Register & Profile serializers
│   │   ├── tasks.py         # Celery registration confirmation email task
│   │   ├── urls.py          # Auth endpoints (login, register, logout, me, refresh)
│   │   └── views.py         # Registration & Profile API endpoints
│   ├── monitoring/          # Core monitoring logic
│   │   ├── models.py        # Monitor, MonitorLog, Incident, StatusPage, MaintenanceWindow
│   │   ├── serializers.py   # DRF serializers with computed SLA/status properties
│   │   ├── tasks.py         # Celery tasks (check_monitors, send_monitor_alert, cleanup_old_logs)
│   │   ├── urls.py          # Monitor endpoints router setup
│   │   └── views.py         # ViewSets for monitors, incidents, logs, and public status pages
│   ├── manage.py            # Django CLI management entrypoint
│   └── requirements.txt     # Python project dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # Common components (Navbar, ProtectedRoute, LiveStatusBadge)
│   │   ├── pages/           # Landing, Dashboard, Login, Register, CreateMonitor, MonitorDetail, Analytics, StatusPage(s)
│   │   ├── services/        # Axios interceptors & APIs connection configurations
│   │   ├── App.jsx          # Frontend router configuration
│   │   ├── index.css        # Global CSS classes (e.g. scrollbars, glow animation animations, theme base styles)
│   │   └── main.jsx         # App mounting point
│   ├── package.json         # Node scripts & packages dependencies
│   ├── tailwind.config.js   # Tailwind extended theme overrides
│   └── index.html           # Main template shell
├── docker-compose.yml       # Production/Local containers orchestrations
└── README.md                # Quickstart documentation
```

Directory tree note: this snapshot predates the APM addition. New/changed files include:

- `backend/config/pingbeat_apm.py` for the lightweight Django APM middleware.
- `backend/monitoring/migrations/0005_application_apimetricsummary_apimetric_and_more.py` for APM database tables.
- `frontend/src/pages/ApmDashboard.jsx` for the `/apm` dashboard.
- `docs/APM_ARCHITECTURE.md` for the detailed APM architecture and SDK design.

---

## 💾 Backend: Data Models

### 1. `Monitor`
Represents a monitored resource.
- **Fields**: `user` (FK to User), `name`, `url`, `expected_status` (defaults to 200), `interval_seconds`, `timeout_seconds`, `is_active`, `email_alerts`, `http_method`, `headers` (JSON), `body` (Text), `keyword` (assertion fallback), `webhook_url`, `notification_channel` (email/discord/slack/webhook), `tags`, `ssl_expiry`, `ssl_issuer`, `assert_keyword`, `assert_max_response_time_ms`.
- **Computed Properties (Serializers)**:
  - `is_up`: Status of the last check log.
  - `last_checked`: Date/time of the last check.
  - `last_response_time`: Duration of the last check in ms.
  - `last_status_code`: Status code of the last check.
  - `status_changed_at`: Timestamp when the monitor transitioned from UP to DOWN or vice versa.
  - `current_status`: Current active status ('paused', 'up', 'down', 'unknown').

### 2. `MonitorLog`
Stores the results of individual monitor checks.
- **Fields**: `monitor` (FK), `status_code`, `response_time_ms`, `is_up`, `error_message`, `checked_at`, `region`, `ssl_expiry_date`, `ssl_days_remaining`, `ssl_warning`, `failure_reason`, `status`.

### 3. `Incident`
Represents downtime events. Created when a monitor transitions to DOWN, and resolved when it goes back UP.
- **Fields**: `monitor` (FK), `started_at`, `resolved_at`, `duration_seconds`, `error_message`.

### 4. `StatusPage`
A user-facing public/private page displaying the status of selected monitors.
- **Fields**: `user` (FK), `title`, `slug` (unique), `is_public`, `monitors` (M2M).

### 5. `MaintenanceWindow`
Scheduled periods where checks are skipped and marked with 'maintenance' status.
- **Fields**: `monitor` (FK), `start_time`, `end_time`, `label`.

### 6. `Application`
Represents an application instrumented by the PingBEAT APM SDK.
- **Fields**: `user` (FK), `name`, `environment`, `api_key`, `created_at`.
- **Purpose**: Dashboard users create applications from `/apm`; each application receives a generated `pb_...` API key used by SDKs.

### 7. `ApiMetric`
Stores raw API performance events sent by SDK batches.
- **Fields**: `application` (FK), `endpoint`, `method`, `status_code`, `response_time_ms`, `timestamp`, `created_at`.
- **Indexes**: Optimized for application/time, endpoint/time, and status/time analytics queries.

### 8. `ApiMetricSummary`
Stores minute-level APM rollups used by dashboard APIs.
- **Fields**: `application` (FK), `endpoint`, `requests_count`, `avg_response_time`, `p95_latency`, `p99_latency`, `error_rate`, `minute_bucket`.
- **Constraint**: Unique per `application + endpoint + minute_bucket`.

---

## ⚡ Background Tasks (Celery & Celery Beat)

Background jobs are defined in `backend/monitoring/tasks.py` and `backend/accounts/tasks.py`:

1. **`check_monitors()`**
   - Scheduled via Celery Beat to run **every 30 seconds**.
   - Iterates over active monitors, performs HTTP check using requests, measures response time, runs assertions (status code, keyword, max response time), updates SSL expiry fields, logs the result in `MonitorLog`, manages `Incident` state changes, and sends alerts on transition.
2. **`send_monitor_alert(monitor_id, previous_is_up, is_up, error_message)`**
   - Dispatched asynchronously on status changes.
   - Formats content and sends notifications to the configured channel: Email (via Brevo SMTP or console fallback), Slack (Incoming Webhooks), Discord (Incoming Webhooks), or Custom Webhook endpoints.
3. **`send_registration_confirmation_email(user_id)`**
   - Dispatched asynchronously after normal registration and first-time Google sign-up.
   - Sends the account confirmation email from a Celery worker via Brevo API when configured, with Django email backend fallback.
4. **`cleanup_old_logs(days_to_keep=30)`**
   - Scheduled via Celery Beat to run **daily at midnight**.
   - Deletes logs older than 30 days to avoid db bloat.
5. **`process_apm_metrics(application_id, metrics)`**
   - Persists SDK metric batches using `bulk_create`.
   - Called asynchronously through Celery in production-style mode.
   - Can be called synchronously in local `DEBUG=True` mode through `PINGBEAT_APM_SYNC_INGEST`.
6. **`aggregate_apm_metrics(minutes_back=10)`**
   - Scheduled via Celery Beat to run **every 60 seconds**.
   - Aggregates raw `ApiMetric` rows into `ApiMetricSummary` minute buckets.
   - Calculates request count, average response time, P95 latency, P99 latency, and 4xx/5xx error rate.

### PingBEAT APM Middleware

`backend/config/pingbeat_apm.py` contains `PingBeatAPMMiddleware`, a lightweight SDK-style middleware used to self-monitor this Django project.

- Captures request path, method, response status code, response time, and timestamp.
- Stores metrics in an in-memory buffer and flushes on a timer.
- Uses `PINGBEAT_APM_API_KEY` to identify the registered APM application.
- Uses `PINGBEAT_APM_INGEST_URL` for normal HTTP SDK ingestion.
- Uses `PINGBEAT_APM_LOCAL_CAPTURE=True` in local debug mode to write directly to the database and avoid self-calling the dev server.
- Excludes `/api/apm/ingest/`, `/admin/`, and `/static/` from capture by default.

---

## 🔌 API Reference Endpoints

### 🔐 Authentication

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/register/` | Register new user + return JWT | No |
| `POST` | `/api/login/` | Login with email + password (get access + refresh tokens) | No |
| `POST` | `/api/google-login/` | Validate a Google ID token, create/reuse the email user, and return JWT | No |
| `POST` | `/api/token/refresh/` | Refresh JWT access token | No |
| `POST` | `/api/logout/` | Blacklist refresh token | Yes |
| `GET` | `/api/me/` | Current user profile details | Yes |

### 📈 Monitors & Logs

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/monitors/` | List all monitors for auth user | Yes |
| `POST` | `/api/monitors/` | Create a monitor | Yes |
| `GET` | `/api/monitors/:id/` | Get a monitor detail | Yes |
| `PUT`/`PATCH`| `/api/monitors/:id/` | Update a monitor | Yes |
| `DELETE` | `/api/monitors/:id/` | Delete a monitor | Yes |
| `POST` | `/api/monitors/:id/pause/` | Pause checking a monitor | Yes |
| `POST` | `/api/monitors/:id/resume/` | Resume checking a monitor | Yes |
| `POST` | `/api/monitors/bulk_action/` | Bulk pause/resume/delete monitors | Yes |
| `GET` | `/api/monitors/:id/stats/` | Fetch SLA metrics, 24h charts, latency stats | Yes |
| `GET` | `/api/monitors/:id/export_csv/`| Export logs as a downloadable CSV | Yes |
| `GET` | `/api/logs/` | List global logs (can filter by `monitor_id`) | Yes |
| `GET` | `/api/analytics/` | Aggregate SLA, latency, heatmaps for dashboard | Yes |

### 🚨 Incidents & Maintenance

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/incidents/` | List historical incidents | Yes |
| `GET` | `/api/maintenance-windows/` | List maintenance windows (filter by `monitor_id`) | Yes |
| `POST` | `/api/maintenance-windows/` | Create a maintenance window | Yes |
| `DELETE` | `/api/maintenance-windows/:id/` | Delete a maintenance window | Yes |

### 🌍 Status Pages (Public & Badges)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/status-pages/` | List/manage user's status page setups | Yes |
| `POST` | `/api/status-pages/` | Create a status page configuration | Yes |
| `GET` | `/api/public-status/:slug/` | Fetch status page header + 90-day history metrics | No |
| `GET` | `/api/monitors/:id/badge/` | Returns Shields.io styled SVG badge for uptime | No |

### Application Performance Monitoring

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/apm/ingest/` | SDK batch metric ingestion; validates `api_key`, validates payload, queues or sync-processes metrics | No, uses APM API key |
| `GET` | `/api/apm/applications/` | List registered APM applications for the authenticated user | Yes |
| `POST` | `/api/apm/applications/` | Register an APM application and generate a `pb_...` API key | Yes |
| `GET` | `/api/apm/applications/:id/` | Fetch one APM application | Yes |
| `GET` | `/api/apm/analytics/` | Overview totals: total requests, average response time, error rate, active apps, p95, p99 | Yes |
| `GET` | `/api/apm/endpoints/` | Endpoint-level analytics and rankings | Yes |
| `GET` | `/api/apm/traffic/` | Minute-level traffic, latency, and error trend series | Yes |
| `GET` | `/api/apm/errors/` | Raw 4xx/5xx error breakdown by status code and endpoint | Yes |

APM analytics endpoints support `hours`, `application_id`, and in some cases `endpoint` query parameters.

---

## 🎨 Frontend UI Pages

Located under `frontend/src/pages/`:

1. **`LandingPage.jsx`**: Expanded homepage for unauthenticated visitors with auth-aware CTAs, scroll reveal animations, uptime bars, response-time chart, workflow timeline, feature coverage, data model summary, Celery job overview, status page and alerting explanations.
2. **`Login.jsx` / `Register.jsx`**: Forms for authenticating and onboarding users.
3. **`Dashboard.jsx`**: Main user view containing monitor status cards, live status check triggers, bulk operations, search/tag filters, and creation links.
4. **`CreateMonitor.jsx`**: Configurable form layout handling HTTP settings (headers, HTTP body, check timers, threshold assertions, and alert integration parameters). Runs in dual mode for creations & edits.
5. **`MonitorDetail.jsx`**: Dedicated inspector for a single monitor. Displays 24-hour latency charts (via Recharts), SLA percentages, active incidents, maintenance configurations, and recent checklist tables.
6. **`Analytics.jsx`**: Visual dashboard showing global metrics across the entire portfolio (heatmap, slowest components list, SLA metrics).
7. **`StatusPageManager.jsx`**: Admin manager for users to customize public pages and extract embed codes.
8. **`StatusPage.jsx`**: Clean public page displaying 90-day uptime timelines (grid rows of status blocks) and active incidents. Uses unauthenticated requests.
9. **`AboutPage.jsx`**: Dedicated public About page explaining PingBEAT's mission, self-hosted architecture, monitoring workflow, alerting model, and operating principles.
10. **`ApmDashboard.jsx`**: APM workspace at `/apm`. Users register applications, copy API keys, filter by app/time range, and view total requests, average response time, error rate, active apps, traffic bars, latency distribution, endpoint tables, slowest endpoints, and error breakdowns.

### Frontend APM API Client

`frontend/src/services/api.js` includes:

- `getApmApplications()`
- `createApmApplication(data)`
- `getApmApplication(id)`
- `getApmAnalytics(params)`
- `getApmEndpoints(params)`
- `getApmTraffic(params)`
- `getApmErrors(params)`

`frontend/src/App.jsx` registers `/apm`, and `frontend/src/components/Navbar.jsx` exposes an `APM` nav link.

---

## Recent Maintenance Notes

- Updated authentication so new registrations use the email address as the Django `username`/user id. Login now accepts an `email` field instead of a separate username, and both register/login validate email format on the frontend and backend.
- Added Google sign-in/sign-up buttons on `Login.jsx` and `Register.jsx` using Google Identity Services with client id `1091250855625-00rf2erbba7u9acaeapknl82p890jst4.apps.googleusercontent.com`. Backend endpoint `/api/google-login/` verifies the ID token audience/email before issuing the existing JWT token pair.
- Successful account creation now queues `accounts.tasks.send_registration_confirmation_email` through Redis/Celery to send a confirmation email to the user's email address. The task uses Brevo API when `BREVO_API_KEY` and `BREVO_SENDER_EMAIL` are configured, with Django email backend fallback.
- Added Application Performance Monitoring (APM) to PingBEAT using the existing `monitoring` Django app rather than introducing a new app.
- Added APM models: `Application`, `ApiMetric`, and `ApiMetricSummary`, plus migration `0005_application_apimetricsummary_apimetric_and_more.py`.
- Added APM serializers for application CRUD, raw/summary output, and SDK ingest payload validation with max batch size of 1000 metrics.
- Added APM endpoints: `/api/apm/ingest/`, `/api/apm/applications/`, `/api/apm/analytics/`, `/api/apm/endpoints/`, `/api/apm/traffic/`, and `/api/apm/errors/`.
- Added Celery APM workflow: `process_apm_metrics` bulk-inserts raw metric batches and `aggregate_apm_metrics` creates minute-level summary rows every 60 seconds.
- Added local dev sync ingest mode through `PINGBEAT_APM_SYNC_INGEST=True`, allowing APM ingest to save and aggregate without requiring a Celery worker during simple local testing.
- Added `backend/config/pingbeat_apm.py`, a lightweight Django middleware SDK that batches this project’s own API metrics and supports direct local capture through `PINGBEAT_APM_LOCAL_CAPTURE=True`.
- Added APM settings in `backend/config/settings.py`: `PINGBEAT_APM_API_KEY`, `PINGBEAT_APM_INGEST_URL`, `PINGBEAT_APM_FLUSH_INTERVAL_SECONDS`, `PINGBEAT_APM_MAX_BATCH_SIZE`, `PINGBEAT_APM_TIMEOUT_SECONDS`, `PINGBEAT_APM_SYNC_INGEST`, `PINGBEAT_APM_LOCAL_CAPTURE`, and excluded paths.
- Added Docker Compose env wiring for `PINGBEAT_APM_API_KEY`, `PINGBEAT_APM_INGEST_URL`, and `PINGBEAT_APM_FLUSH_INTERVAL_SECONDS`.
- Added `frontend/src/pages/ApmDashboard.jsx`, `/apm` routing, navbar APM link, and frontend API helpers for APM application/analytics/traffic/error APIs.
- Added `docs/APM_ARCHITECTURE.md` with full APM architecture, SDK design for Django/FastAPI/Flask/Express, ER diagram, API examples, Celery workflow, dashboard wireframe, scaling strategy, security notes, and roadmap.
- Adjusted database connection settings for remote Render PostgreSQL stability: `DB_CONN_MAX_AGE` defaults to `0` in debug and `CONN_HEALTH_CHECKS=True`.
- Added a canonical protected `/dashboard` frontend route. Authenticated visits to `/` now redirect to `/dashboard`, while unauthenticated visits still show `LandingPage`.
- Login and registration now redirect directly to `/dashboard` after storing JWT tokens instead of returning users to the landing route.
- Landing page "Go to Dashboard" CTAs, the authenticated navbar logo, dashboard nav item, post-monitor-save redirect, and post-delete redirect now consistently target `/dashboard`.
- Fixed the root-level `manage.py` entrypoint so it inserts `backend/` on `sys.path` and uses `config.settings`; both `python manage.py check` from the project root and from `backend/` pass.
- Fixed `MonitorDetail.jsx` blank-page crashes by restoring the missing local state hooks for monitor data, logs, stats, incidents, loading/error flags, actions, and delete confirmation. Monitor detail back links now also target `/dashboard`.
- Updated monitor detail Recent Checks to request/show only the latest 50 logs and paginate them into 25-row batches (`1-25` and `26-50`).
- Replaced the navbar "Logged in as ..." text and always-visible Logout button with a compact user avatar menu; clicking the avatar reveals the username and Logout action.
- Removed the decorative red/green status dots from dashboard monitor rows; row status remains available through `LiveStatusBadge`.
- Dashboard monitor rows show a date-only last-checked field. Their status area uses a fixed-width `UP Running`/`DOWN Running` pill with elapsed time in a separate fixed text slot so changing duration text does not shift the status bubble.
- Widened dashboard status pills and forced no-wrap text so both `UP Running` and `DOWN Running` stay on one line.
- Dashboard monitor row metadata now uses fixed grid columns for status, elapsed time, latency, date, and navigation arrow so status bubbles align vertically across rows.
- Standardized dashboard monitor metadata gaps so spacing between status, elapsed time, latency, date, and arrow follows the same column rhythm.
- Added a dedicated `/about` route backed by `AboutPage.jsx`; it replaces the previous behavior where `/about` reused the landing page.
- Updated `AboutPage.jsx` so informational cards/steps render row-wise instead of in wide single-row grids, and added IntersectionObserver-based scroll reveal animation for page sections and cards.
- Removed the dark "Live Service Snapshot" card from the About page hero for a cleaner, more professional text-led introduction.
- Rebuilt `LandingPage.jsx` into a full project overview: hero + uptime graph, metric summary, feature matrix, monitor workflow, analytics graph, data model rows, Celery/background job section, and status/alerting coverage. Scroll reveal animations now apply across all landing sections. The Architecture, API overview, and Run locally/development command sections were later removed from the landing page.
