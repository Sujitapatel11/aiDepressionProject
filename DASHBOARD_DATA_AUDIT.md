# SoulCare Dashboard — Product Reality Audit

---

### Executive Summary
This audit evaluates every component, card, graph, and statistic on the SoulCare Dashboard against the current production Django backend architecture to enforce the rule: **No hardcoded fake data. Real user data only. Unsupported widgets render elegant empty states.**

---

### Component Data Audit Table

| Component Name | Current Data Source | API Endpoint | Backend Model | Business Rule | Status | Action Taken |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Greeting Banner & Username** | `localStorage` (`sc_username`) & Client Clock | N/A (Session Context) | `django.contrib.auth.models.User` | Displays greeting based on time of day (Morning/Afternoon/Evening) and active username. | **Existing** | ✅ Renders Real User Greeting |
| **Daily Reflection Prompt** | `PROMPTS` array in `app.js` | Computed Client-side via Date Hash | N/A | Daily deterministic index: `(new Date().getDay() + new Date().getDate()) % PROMPTS.length`. | **Existing** | ✅ Renders Real Daily Prompt |
| **Journal Entries Count** | `dashboard_view` | `GET /api/dashboard/` | `apps.journal.models.JournalEntry` | Counts non-deleted journal entries owned by `request.user`. | **Existing** | ✅ Renders Real Journal Count |
| **Active Peer Connections Count** | `dashboard_view` | `GET /api/dashboard/` | `apps.support.models.SupportConnection` | Counts accepted support connections where `user_one` or `user_two` is `request.user`. | **Existing** | ✅ Renders Real Connections Count |
| **Pending Support Requests Count** | `dashboard_view` | `GET /api/dashboard/` | `apps.support.models.SupportRequest` | Counts pending support invitations directed to `request.user`. | **Existing** | ✅ Renders Real Pending Count |
| **Unread AI Insights Count** | `dashboard_view` | `GET /api/dashboard/` | `apps.insights.models.Insight` | Counts unread and undismissed AI insights for `request.user`. | **Existing** | ✅ Renders Real Insights Count |
| **Latest Reflection Entry Preview** | `dashboard_view` | `GET /api/dashboard/` | `apps.journal.models.JournalEntry` | Returns first 200 characters of the latest non-deleted journal entry. | **Existing** | ✅ Renders Real Entry or Empty State |
| **User Avatar Initials** | `localStorage` (`sc_username`) | Session Context | `django.contrib.auth.models.User` | Extracts first 2 capital letters of active username. | **Existing** | ✅ Renders Real User Initials |
| **7-Day Healing Streak Tracker** | Static visual | None | None | No backend tracking model exists for daily login/reflection streaks. | **Needs Database & API** | 🔲 Rendered Elegant Empty State: *"Complete today's check-in"* |
| **Weekly Mood Graph Visualizer** | Static visual | None | None | No backend aggregate endpoint exists for 7-day mood score history. | **Needs API & Database** | 🔲 Rendered Elegant Empty State: *"No mood history recorded yet"* |
| **Sleep Quality Card** | Static visual | None | None | No sleep tracking model exists in backend. | **Needs Database** | 🔲 Rendered Elegant Empty State: *"Connect sleep tracker"* |
| **Stress Level Card** | Static visual | None | None | No stress assessment model exists in backend. | **Needs Database** | 🔲 Rendered Elegant Empty State: *"Log stress assessment"* |
| **Energy / Vitality Card** | Static visual | None | None | No energy telemetry model exists in backend. | **Needs Database** | 🔲 Rendered Elegant Empty State: *"Track daily energy"* |
| **Recommended Audio Carousel** | Static visual | None | None | No audio playlist or meditation media model exists in backend. | **Needs Database** | 🔲 Rendered Elegant Empty State: *"No audio playlists loaded"* |

---

### Detailed Refactoring Strategy

1. **Active Real Data Integration**:
   - `#d-dash-greeting` & `#m-dash-greeting` $\rightarrow$ Dynamically computed greeting + User Name.
   - `#d-dash-journals` & `#m-dash-journals` $\rightarrow$ Real database count from `JournalEntry`.
   - `#d-dash-connections` & `#m-dash-connections` $\rightarrow$ Real database count from `SupportConnection`.
   - `#d-dash-requests` & `#m-dash-requests` $\rightarrow$ Real database count from `SupportRequest`.
   - `#d-dash-insights` & `#m-dash-insights` $\rightarrow$ Real database count from `Insight`.
   - `#d-dash-latest` & `#m-dash-latest` $\rightarrow$ Real preview snippet of `latest_journal_preview`. If null, displays: `"No entries yet. Start writing!"`.

2. **Elegant Empty States for Unsupported Components**:
   - **Streak Banner**: Replaced hardcoded "7 Days Strong" with an interactive *"Start Your Daily Healing Streak — Log a reflection today"* check-in badge.
   - **Weekly Mood Graph**: Replaced fake graph bars with a clean empty state card: *"No mood history recorded yet. Complete your first check-in to unlock your visual healing trend."*
   - **Wellness Cards (Sleep, Stress, Energy)**: Replaced fake numbers with interactive action prompts (*"Log Sleep"*, *"Measure Calm"*, *"Check Energy"*).

---

### Compliance Checklist

- [x] **No hardcoded fake numbers**: Every statistic represents live database values or explicit empty states.
- [x] **Zero Backend Breaking Changes**: All API endpoints (`GET /api/dashboard/`) and DOM IDs are 100% preserved.
- [x] **Seamless UX Fallbacks**: Clean empty states encourage user engagement without deceiving the user.
