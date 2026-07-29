# SoulCare AI Insights — Product Feature & Reality Audit

---

### Executive Summary
This audit evaluates every feature in the SoulCare AI Insights page against backend REST APIs (`GET /api/insights/`, `POST /api/insights/dismiss/<id>/`), Django database models (`apps.insights.models.Insight`), and the NLP processing engine (`apps.insights.engine`) to ensure **100% real data display and zero medical/clinical jargon.**

---

### Feature Audit Matrix Table

| Component Name | Current Data Source | API Endpoint | Backend Model | Business Rule | Status | Implementation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Companion Banner** | Static & Dynamic Session | N/A | N/A | Warm companion message: *"Every journal entry helps reveal patterns that support your wellbeing."* | **Existing** | Inspiring introductory hero card setting a calm, non-clinical tone. |
| **Today's Reflections** | `allInsights[0]` | `GET /api/insights/` | `apps.insights.models.Insight` | Displays the user's latest AI insight record or onboarding empty state. | **Existing** | Binds real latest `Insight` object or displays onboarding card. |
| **Weekly Mood Trends** | `buildMoodChart()` | `GET /api/insights/` | `apps.insights.models.Insight` | Computes 7-day average sentiment scores (`-1.0` to `+1.0`) from historical records. | **Existing** | Visualized via `#d-mood-chart` and `#d-mood-chart-labels`. |
| **Mood Filter Chips** | `renderInsightFilter()` | `GET /api/insights/` | `apps.insights.models.Insight` | Filters displayed insight cards by mood category (`Positive`, `Negative`, `Neutral`, `Mixed`). | **Existing** | Interactively filters fetched insight cards array. |
| **Insights Feed** | `renderInsights()` | `GET /api/insights/` | `apps.insights.models.Insight` | Renders non-dismissed insight cards sorted by `created_at` descending. | **Existing** | Formatted as $28\text{px}$ rounded glass cards with gentle language. |
| **Dismiss Insight Action** | `dismissInsight(id)` | `POST /api/insights/dismiss/<id>/` | `apps.insights.models.Insight` | Marks `is_dismissed=True` in database and updates DOM feed. | **Existing** | Smoothly removes dismissed insight from active view. |
| **Inspiring Empty State** | `renderInsights()` in `app.js` | N/A | N/A | Displays *"🌱 Your AI companion is still learning..."* when 0 insights exist. | **Existing** | Encourages user to write their first journal entry. |

---

### Tone & Safety Principles
1. **Gentle Non-Clinical Phrasing**: Uses reflective phrasing like *"I noticed..."*, *"It seems..."*, and *"Your recent reflections suggest..."*.
2. **Zero Diagnostic Jargon**: Avoids all medical labels, clinical terms, or diagnostic statements.
3. **Real Data Integrity**: Displays only active database records from `GET /api/insights/`.
