# SoulCare Modular Health Architecture — Independent Sleep Module

---

### Executive Summary
This architecture specification details the design for the **Independent Restful Sleep Module** (`apps/sleep`). In accordance with SoulCare's modular health architecture, the Sleep Tracker runs as an autonomous subsystem with its own database models, REST APIs, state management, and presentation layer. It integrates with the main Dashboard **strictly via read-only aggregated statistics** (`GET /api/sleep/stats/`) and does NOT depend on Journal, Mood, or AI Insights models.

---

### Deliverable 1: Sleep Module Architecture

```
                               ┌───────────────────────────┐
                               │   SoulCare Dashboard UI   │
                               └─────────────┬─────────────┘
                                             │ GET /api/sleep/stats/ (Read-Only)
                                             ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          INDEPENDENT SLEEP SUBSYSTEM                            │
│                                                                                 │
│   Frontend View               REST API                 Backend Service          │
│   (#desk-sleep / #mob-sleep) ──► POST /api/sleep/ ──────► SleepEntry Model      │
│   (#sleep-history-list)      ──► GET  /api/sleep/ ──────► PostgreSQL / SQLite   │
│   (#sleep-chart)             ──► GET  /api/sleep/stats/                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

### Deliverable 2: Product Reality Audit

| Component Name | Current Data Source | API Endpoint | Backend Model | Business Rule | Status | Implementation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Today's Sleep Record** | `loadTodaySleep()` | `GET /api/sleep/today/` | `apps.sleep.models.SleepEntry` | Max ONE entry per user per date. Auto-computes duration in hours. | **New** | Formatted card with bedtime/wake pickers & quality selectors. |
| **Sleep Entry Creation** | `saveSleep()` | `POST /api/sleep/` | `apps.sleep.models.SleepEntry` | Validates time range and updates or creates date-specific record. | **New** | Invoked via "Save Sleep Record" button. |
| **7-Day Sleep Duration Graph** | `renderSleepChart()` | `GET /api/sleep/stats/` | `apps.sleep.models.SleepEntry` | Plots trailing 7-day sleep duration bars in hours. | **New** | Rendered inside `#sleep-chart` & `#sleep-chart-labels`. |
| **Sleep History Timeline** | `loadSleep()` | `GET /api/sleep/` | `apps.sleep.models.SleepEntry` | Returns historical sleep records sorted descending by `sleep_date`. | **New** | Renders timeline cards with duration & quality badges. |
| **Dashboard Integration** | `loadDashboard()` | `GET /api/sleep/stats/` | Aggregated Stats | Dashboard displays average sleep hours & navigates to `showTab('sleep')`. | **New** | Replaces old Journal navigation with direct Sleep Tracker tab transition. |

---

### Deliverable 3: Database Schema (`SleepEntry`)

#### Model Definition (`apps/sleep/models.py`)
```python
from django.db import models
from django.contrib.auth.models import User
from datetime import date

class SleepEntry(models.Model):
    QUALITY_CHOICES = [
        ('great', 'Great'),
        ('good', 'Good'),
        ('fair', 'Fair'),
        ('poor', 'Poor'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="sleep_entries")
    sleep_date = models.DateField(default=date.today, db_index=True)
    bedtime = models.DateTimeField()
    wake_time = models.DateTimeField()
    total_sleep_hours = models.FloatField(default=0.0)
    sleep_quality = models.CharField(max_length=16, choices=QUALITY_CHOICES, default='good')
    sleep_notes = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-sleep_date"]
        unique_together = ["user", "sleep_date"]
```

---

### Deliverable 4: API Specification

1. `GET /api/sleep/`
   - **Description**: Returns list of all historical sleep entries for `request.user`.
   - **Response**: `[ { "id": 1, "sleep_date": "2026-07-29", "bedtime": "...", "wake_time": "...", "total_sleep_hours": 8.0, "sleep_quality": "great", "sleep_notes": "Refreshed" } ]`

2. `POST /api/sleep/`
   - **Description**: Creates or updates today's sleep entry. Calculates `total_sleep_hours = (wake_time - bedtime).total_seconds() / 3600.0`.

3. `GET /api/sleep/today/`
   - **Description**: Returns today's active sleep record or 404 if not yet recorded.

4. `PUT/PATCH /api/sleep/<id>/`
   - **Description**: Updates specific sleep entry by ID.

5. `DELETE /api/sleep/<id>/`
   - **Description**: Deletes specified sleep entry by ID.

6. `GET /api/sleep/stats/`
   - **Description**: Returns summary stats for Dashboard: `{ "latest_hours": 8.0, "avg_7d": 7.8, "sleep_quality": "great", "total_logs": 14 }`.

---

### Deliverable 5: Navigation Flow

```
[ Dashboard Home ]
       │
       ├──── Click "Restful Sleep" Card ──► showTab('sleep') ──► Dedicated Sleep Tracker
       │
[ Bottom Navigation Bar ]
       │
       └──── Click "🌙 Sleep" Tab ──────────────────────────► Dedicated Sleep Tracker
```

---

### Deliverable 6: DOM Mapping

- `#desk-sleep` & `#mob-sleep` $\rightarrow$ Main view shells.
- `#sleep-bedtime-input` $\rightarrow$ Bedtime datetime/time input.
- `#sleep-wake-input` $\rightarrow$ Wake time datetime/time input.
- `#sleep-quality-select` $\rightarrow$ Sleep quality pill buttons (`Great`, `Good`, `Fair`, `Poor`).
- `#sleep-notes-input` $\rightarrow$ Textarea for sleep notes.
- `#sleep-save-btn` $\rightarrow$ Save button invoking `saveSleep()`.
- `#sleep-history-list` $\rightarrow$ Target container for historical sleep cards.
- `#sleep-chart` & `#sleep-chart-labels` $\rightarrow$ 7-day sleep duration chart container.

---

### Deliverable 7: Backend Integration Plan

1. Create directory `backend/apps/sleep`.
2. Add `models.py`, `serializers.py`, `views.py`, `urls.py`, and `__init__.py`.
3. Add `'apps.sleep'` to `INSTALLED_APPS` in `config/settings.py`.
4. Include `path('api/sleep/', include('apps.sleep.urls'))` in `config/urls.py`.
5. Run migrations: `python manage.py makemigrations sleep` and `python manage.py migrate`.

---

### Deliverable 8: Frontend Wireframe

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │ 🌙 RESTFUL SLEEP TRACKER                                              │
 │ "Quality sleep is the foundation of mental clarity & emotional peace." │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 🛏️ TODAY'S SLEEP ENTRY                                                │
 │ Bedtime: [ 10:30 PM ]    Wake Time: [ 06:30 AM ]   Duration: 8.0 hrs  │
 │ Quality: [ 😊 Great ]  [ 🙂 Good ]  [ 😐 Fair ]  [ 🙁 Poor ]           │
 │ Notes: [ Woke up feeling peaceful and refreshed...                  ] │
 │ [ Save Sleep Record → ]                                                │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 📊 7-DAY SLEEP DURATION TREND                        7.8 hrs avg/night │
 │ [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]                              │
 │  8.0h  7.5h  8.2h  7.0h  8.5h  7.8h  8.0h                              │
 ├────────────────────────────────────────────────────────────────────────┤
 │ 📚 SLEEP HISTORY TIMELINE                                              │
 └────────────────────────────────────────────────────────────────────────┘
```
