# Backend UML Diagrams

## Structural Diagram

```mermaid
classDiagram
    class User {
        id
        username
        email
        date_joined
    }

    class Monitor {
        name
        url
        expected_status
        interval_seconds
        timeout_seconds
        is_active
        http_method
        headers
        body
        keyword
        webhook_url
        notification_channel
        tags
        ssl_expiry
        ssl_issuer
        assert_keyword
        assert_max_response_time_ms
        last_log()
        is_up()
    }

    class MonitorLog {
        status_code
        response_time_ms
        is_up
        error_message
        checked_at
        region
        ssl_expiry_date
        ssl_days_remaining
        ssl_warning
        failure_reason
        status
    }

    class Incident {
        started_at
        resolved_at
        duration_seconds
        error_message
    }

    class StatusPage {
        title
        slug
        is_public
        created_at
    }

    class MaintenanceWindow {
        start_time
        end_time
        label
        created_at
    }

    class Application {
        name
        environment
        api_key
        created_at
    }

    class ApiMetric {
        endpoint
        method
        status_code
        response_time_ms
        timestamp
        created_at
    }

    class ApiMetricSummary {
        endpoint
        requests_count
        avg_response_time
        p95_latency
        p99_latency
        error_rate
        minute_bucket
    }

    User "1" --> "*" Monitor
    User "1" --> "*" StatusPage
    User "1" --> "*" Application
    Monitor "1" --> "*" MonitorLog
    Monitor "1" --> "*" Incident
    Monitor "1" --> "*" MaintenanceWindow
    StatusPage "*" --> "*" Monitor
    Application "1" --> "*" ApiMetric
    Application "1" --> "*" ApiMetricSummary
```

```mermaid
flowchart LR
    Frontend[React Frontend] --> API[Django REST API]
    API --> Accounts[accounts app]
    API --> Monitoring[monitoring app]
    API --> JWT[Simple JWT]
    API --> DB[(Database)]
    Monitoring --> Celery[Celery Workers]
    Celery --> Redis[(Redis Broker)]
    Celery --> DB
    Celery --> ExternalSites[Monitored URLs]
    Celery --> Email[Email / Brevo]
    Celery --> Webhooks[Slack / Discord / Custom Webhooks]
    SDK[PingBEAT SDK] --> APMIngest[/api/apm/ingest/]
    APMIngest --> Celery
```

## Behavioral Diagrams

### Monitor Check Flow

```mermaid
sequenceDiagram
    participant Beat as Celery Beat
    participant Task as check_monitors
    participant DB as Database
    participant Site as Monitored URL
    participant Alert as send_monitor_alert

    Beat->>Task: run every 30 seconds
    Task->>DB: load active monitors
    loop each due monitor
        Task->>DB: check latest log and maintenance window
        alt maintenance active
            Task->>DB: create maintenance MonitorLog
        else check required
            Task->>Site: HTTP request with monitor settings
            Site-->>Task: response or error
            Task->>DB: create MonitorLog
            alt status changed to down
                Task->>DB: create Incident
                Task->>Alert: queue notification
            else status changed to up
                Task->>DB: resolve active Incident
                Task->>Alert: queue recovery notification
            end
        end
    end
```

### Local APM Development

```env
PINGBEAT_APM_LOCAL_CAPTURE=True
PINGBEAT_APM_SYNC_INGEST=True
PINGBEAT_APM_FLUSH_INTERVAL_SECONDS=10
APM_INGEST_RATE_LIMIT=1000
APM_METRIC_RETENTION_DAYS=7
```

### APM Ingest Flow

```mermaid
sequenceDiagram
    participant SDK as PingBEAT SDK
    participant API as apm_ingest
    participant DB as Database
    participant Worker as Celery Worker

    SDK->>API: POST api_key and metric batch
    API->>API: validate payload
    API->>DB: find Application by api_key
    alt valid key
        API->>Worker: queue process_apm_metrics
        Worker->>DB: bulk create ApiMetric rows
        Worker->>DB: aggregate ApiMetricSummary rows
        API-->>SDK: 202 accepted
    else invalid key
        API-->>SDK: 401 invalid API key
    end
```

### Monitor State

```mermaid
stateDiagram-v2
    [*] --> Unknown
    Unknown --> Up: first successful check
    Unknown --> Down: first failed check
    Up --> Down: failed check
    Down --> Up: recovery check
    Up --> Maintenance: active maintenance window
    Down --> Maintenance: active maintenance window
    Maintenance --> Up: window ends and check passes
    Maintenance --> Down: window ends and check fails
    Up --> Paused: user pauses monitor
    Down --> Paused: user pauses monitor
    Paused --> Unknown: user resumes monitor
```

### Auth Flow

```mermaid
sequenceDiagram
    participant Client
    participant Accounts as accounts API
    participant Google as Google TokenInfo
    participant DB as Database

    alt email registration
        Client->>Accounts: POST /api/register/
        Accounts->>DB: create User
        Accounts-->>Client: user and JWT tokens
    else email login
        Client->>Accounts: POST /api/login/
        Accounts->>DB: find User by email
        Accounts-->>Client: JWT tokens
    else Google login
        Client->>Accounts: POST /api/google-login/
        Accounts->>Google: verify ID token
        Accounts->>DB: get or create User
        Accounts-->>Client: user and JWT tokens
    end
```
