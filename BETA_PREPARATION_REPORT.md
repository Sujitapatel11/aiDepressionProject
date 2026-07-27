# SoulCare Closed Beta Preparation & Readiness Report

**Report Version**: 1.0.0  
**Environment Target**: STAGING / CLOSED BETA (`staging-api.soulcare.app`)  
**Execution Date**: July 27, 2026  
**Auditor**: Principal Product Engineer, QA Lead, & Release Manager  
**Overall Readiness Gate Status**: **READY FOR REAL HUMAN BETA TESTERS**  

---

## 1. Beta Infrastructure Architecture

The closed beta infrastructure has been implemented using real-time telemetry, structured exception ingestion, privacy-preserving event tracking, and an interactive Web Beta Administration Dashboard.

```mermaid
flowchart TD
    subgraph Real Beta Testers (Mobile & Web)
        A[Flutter iOS / Android Client]
        B[Web App Client]
    end

    subgraph Telemetry & Feedback Ingestion APIs
        C[POST /api/telemetry/crash/]
        D[POST /api/telemetry/event/]
        E[POST /api/telemetry/log/]
        F[POST /api/feedback/]
    end

    subgraph Database Subsystem (apps.telemetry)
        G[(CrashReport Table)]
        H[(AnalyticsEvent Table)]
        I[(ClientLog Table)]
        J[(FeedbackItem Table)]
    end

    subgraph Beta Administration & Monitoring
        K[GET /api/dashboard/beta/]
        L[Web Administration Dashboard UI /beta-admin/]
    end

    A -->|Fatal / Non-Fatal Exceptions| C
    A -->|DAU, WAU, Feature Interactions| D
    A -->|Error & Latency Logs| E
    B -->|Bug Reports & Feedback| F

    C --> G
    D --> H
    E --> I
    F --> J

    G --> K
    H --> K
    I --> K
    J --> K

    K --> L
```

### Ingestion Subsystem Components
- **Django Application**: [`apps.telemetry`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/apps/telemetry/models.py) registered in `INSTALLED_APPS`.
- **Database Schema**: 4 database tables (`telemetry_crashreport`, `telemetry_analyticsevent`, `telemetry_clientlog`, `telemetry_feedbackitem`) created with composite indexes on `created_at`, `severity`, `category`, and `event_name`.
- **Web Administration Dashboard UI**: Responsive live interface at [`/beta-admin/`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/web/templates/web/beta_admin.html) with 10-second auto-polling.

---

## 2. Analytics Configuration

The analytics pipeline measures privacy-safe user activity without storing sensitive mental health journal contents in analytics records.

### Tracked Interaction Matrix
| Event Name | Domain | Trigger Description | Metadata Captured |
| :--- | :--- | :--- | :--- |
| `session_start` | Lifecycle | App launch or foreground resume | `platform`, `app_version` |
| `screen_view` | Navigation | User opens a screen | `screen_name` |
| `button_click` | Interaction | User taps an interactive element | `button_id`, `screen_name` |
| `journal_created` | Journal | User creates a new journal entry | `word_count`, `mood_score` |
| `mood_checkin` | Mood Check-In | User submits daily mood score | `mood_score`, `anxiety_level` |
| `ai_insight_used` | AI Insights | User requests AI reflection | `journal_id`, `sentiment_label` |
| `community_engagement` | Community | User views peer matches or vectors | `match_score`, `mbti_type` |
| `chat_message_sent` | Chat | User sends peer support chat message | `connection_id`, `char_length` |
| `notification_open` | Notifications | User opens incoming notification badge | `notification_type` |

### Key Calculated Metrics
- **Daily Active Users (DAU)**: Unique authenticated user IDs submitting events within a 24-hour window.
- **Weekly Active Users (WAU)**: Unique authenticated user IDs submitting events within a 7-day rolling window.
- **Feature Usage Distribution**: Relative breakdown of event volume across all 10 feature domains.

---

## 3. Crash Reporting Setup

Production-ready crash reporting captures stack traces and device diagnostics automatically.

### Ingestion Flow (`POST /api/telemetry/crash/`)
- **Captured Data**:
  - Full exception stack trace
  - Device info (model, manufacturer, screen resolution, platform)
  - OS Version (e.g. iOS 17.5, Android 14)
  - App Version (e.g. `1.0.0+beta`)
  - User ID (authenticated user ID or anonymous UUID)
  - Severity classification (`fatal` vs `non_fatal`)

### Client Integration (`AppObservabilityHooks`)
Flutter client integration in [`lib/core/config/app_observability_hooks.dart`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/core/config/app_observability_hooks.dart) and [`TelemetryService`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/lib/core/observability/telemetry_service.dart) catches uncaught exceptions and dispatches them asynchronously to the server.

---

## 4. Logging Configuration

Multi-tiered logging ensures both client-side issues and API failures are recorded cleanly.

### Server-Side API Logging
- **Error Log File**: [`backend/logs/staging_error.log`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/logs/staging_error.log) (Structured format: `[{asctime}] {levelname} [{name}:{lineno}] {message}`).
- **Request Log File**: [`backend/logs/staging_request.log`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/logs/staging_request.log) (Captures HTTP method, URI path, status code, response time).

### Client-Side Error & Performance Ingestion (`POST /api/telemetry/log/`)
Stores client-side HTTP timeouts, WebSocket connection drops, and UI rendering delays under `ClientLog` records.

---

## 5. Feedback Collection Pipeline

Beta testers can submit bug reports, suggestions, and feature requests directly within the application.

### Feedback Ingestion Payload (`POST /api/feedback/`)
- **Category**: `bug_report`, `suggestion`, `feature_request`
- **Title & Description**: Detailed problem or enhancement description.
- **Device & OS Information**: Model, OS version, platform.
- **Screenshot Attachment**: Base64 encoded screenshot image string.
- **Status Management**: `open` $\rightarrow$ `in_review` $\rightarrow$ `resolved` via Beta Admin Dashboard.

---

## 6. Beta Tester Instructions & Checklist

Complete step-by-step guidance has been documented in [`BETA_TESTER_CHECKLIST.md`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/BETA_TESTER_CHECKLIST.md) covering:
1. Account Signup & Authentication
2. Journal Entry Creation & Mood Rating
3. Daily Mood Check-In & Analytics View
4. AI Insight Reflection Generation
5. Community Peer Vector Matching
6. Real-Time Chat Messaging
7. In-App Notification Badges
8. Profile & Personality Editing
9. Settings & Security Controls
10. Submitting In-App Feedback & Screenshots

---

## 7. Success Metrics

The closed beta will evaluate the platform against the following baseline metrics:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CLOSED BETA SUCCESS METRICS                     │
├────────────────────────────────┬─────────────────┬─────────────────────┤
│ Metric Name                    │ Target Threshold│ Calculation Method  │
├────────────────────────────────┼─────────────────┼─────────────────────┤
│ Crash-Free Session Rate        │ ≥ 99.0%         │ (Sessions - Fatal) /│
│                                │                 │  Sessions * 100     │
│ API Request Error Rate         │ < 1.0%          │ Failed HTTP 5xx /   │
│                                │                 │ Total Requests      │
│ API Availability               │ ≥ 99.9%         │ Healthy Probe %     │
│ High-Severity Vulnerabilities  │ 0 (Zero P0/P1)  │ Security Audit      │
│ User Feedback Processing       │ 100% Classified │ Admin Triage        │
└────────────────────────────────┴─────────────────┴─────────────────────┘
```

---

## 8. Closed Beta Exit Criteria

The closed beta period will be declared successful and ready for public release when **ALL** of the following exit criteria are satisfied:

1. **Crash-Free Sessions $\ge$ 99.0%**: No widespread fatal crashes across tested device models.
2. **Zero P0 Release Blockers**: All critical system failures, data corruption risks, or app launch blocks are resolved.
3. **Zero Unresolved P1 Security Issues**: All authentication, JWT rotation, rate limiting, and transport security controls remain 100% verified.
4. **API Request Error Rate $<$ 1.0%**: Unhandled HTTP 5xx errors remain below 1.0% under active user load.
5. **API Availability $\ge$ 99.9%**: `/api/health/` uptime probe demonstrates stable server availability.
6. **100% User Feedback Triage**: Every submitted bug report and feature request is triaged, categorized, and assigned.
7. **System Stability Approved**: Engineering leads approve overall platform stability for public release.

---
*Report compiled by Antigravity Engineering Lead & Release Manager.*
