# SoulCare Mood Tracker — Product Feature & Data Audit

---

### Executive Summary
This audit evaluates every feature in the SoulCare Mood Tracker / AI Insights module against the Django backend models, AI sentiment engine (`apps.insights.engine`), and client-side JavaScript architecture to enforce **zero fake data and 100% real user information.**

---

### Feature Audit Matrix Table

| Component Name | Current Data Source | API Endpoint | Backend Model | Business Rule | Status | Implementation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Primary Mood Selector** | Interactive Pill Row | Client-side Session | N/A | Single selection pill row (`Great`, `Calm`, `Good`, `Neutral`, `Sad`, `Very Sad`, `Angry`, `Tired`). | **Existing** | Selected mood prepends tag to journal entry, which triggers AI sentiment analysis. |
| **Wellness Check Sliders** | Interactive Sliders | Client-side Session | N/A | Sliders for Energy, Stress, Sleep Quality, and Focus. | **Existing** | Wellness ratings append metadata to daily reflection log. |
| **Weekly Mood Graph** | `buildMoodChart()` | `GET /api/insights/` | `apps.insights.models.Insight` | Plots 7-day average sentiment score (`-1.0` to `+1.0`) per day using historical insight records. | **Existing** | Displays real sentiment bars or renders onboarding empty state if 0 insights exist. |
| **AI Insights Feed** | `loadInsights()` | `GET /api/insights/` | `apps.insights.models.Insight` | Displays active AI insights and sentiment assessments for `request.user`. | **Existing** | Renders real insight cards or displays onboarding empty state. |
| **Mood Filter Chips** | `renderInsightFilter()` | `GET /api/insights/` | `apps.insights.models.Insight` | Filters displayed insight cards by mood category (`Positive`, `Negative`, `Neutral`, `Mixed`). | **Existing** | Realtime filter over fetched insights array. |
| **Dismiss Insight Action** | `dismissInsight(id)` | `POST /api/insights/dismiss/<id>/` | `apps.insights.models.Insight` | Sets `is_dismissed=True` on specified insight record. | **Existing** | Removes insight card from active view dynamically. |
| **Inspiring Empty State** | `renderInsights()` in `app.js` | N/A | N/A | Renders *"No check-ins yet. Complete today's mood check-in..."* when 0 insights exist. | **Existing** | Guides user directly to complete their first check-in. |

---

### Compliance Guarantee
1. **Real Data Integrity**: Sentiment scores (`-1.0` to `+1.0`) and mood categories (`positive`, `negative`, `neutral`, `mixed`) originate from real NLP analysis on saved journal entries.
2. **Zero Fake Metrics**: Unsupported sliders store context client-side and trigger real journal entries, avoiding synthetic database records.
