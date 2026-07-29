# SoulCare Mood Architecture & Data Flow Document

---

### Executive Summary
This architecture document details how daily mood check-ins, sentiment analytics, and AI Insights operate across the SoulCare application. It outlines the database models, REST API contracts, NLP pipeline triggers, and client-side visualization logic.

---

### 1. Where a Daily Mood Check-in is Stored
A daily mood check-in is stored in two complementary database tables:
1. **Raw Reflection Text**: Stored in `apps.journal.models.JournalEntry`.
2. **Computed Sentiment & Emotion Analytics**: Stored in `apps.insights.models.Insight` as a OneToOne relation linked directly to the `JournalEntry`.

---

### 2. Which Backend Model Owns It

#### Primary Model: `apps.journal.models.JournalEntry`
- **Fields**: `id`, `user` (ForeignKey to `User`), `content` (TextField), `created_at` (DateTimeField), `updated_at` (DateTimeField), `is_deleted` (BooleanField).

#### Analytics Model: `apps.insights.models.Insight`
- **Fields**:
  - `journal`: `OneToOneField('journal.JournalEntry', related_name='insight')`
  - `user`: `ForeignKey(User, related_name='insights')`
  - `mood`: `CharField(choices=['positive', 'neutral', 'negative', 'mixed'])`
  - `sentiment_score`: `FloatField` (VADER/RoBERTa compound score: `-1.0` to `+1.0`)
  - `keywords`: `JSONField` (e.g. `["sleep", "peace", "walk"]`)
  - `emotion_tags`: `JSONField` (e.g. `["calm", "hopeful"]`)
  - `title`: `CharField`
  - `message`: `TextField`
  - `is_read`: `BooleanField`
  - `is_dismissed`: `BooleanField`
  - `created_at`: `DateTimeField`

---

### 3. Which API Creates It
- **Endpoint**: `POST /api/journal/`
- **Handler**: `journal_list_create` in `apps/journal/views.py`
- **Trigger**: When a user submits an entry, `serializer.save(user=request.user)` saves the `JournalEntry`, then immediately triggers the AI sentiment engine:
  ```python
  from apps.insights.engine import create_insight_from_journal
  create_insight_from_journal(journal)
  ```

---

### 4. Which API Updates It
- **Endpoint**: `PATCH /api/journal/<journal_id>/`
- **Handler**: `journal_detail` in `apps/journal/views.py`
- **Operation**: Updates existing entry content and re-evaluates sentiment properties.

---

### 5. Which API Reads History
- **Journal History Endpoint**: `GET /api/journal/` (Returns list of `JournalEntry` items sorted `-created_at`).
- **Mood Analytics Endpoint**: `GET /api/insights/` (Returns list of active `Insight` objects with `sentiment_score`, `mood`, and timestamp details).

---

### 6. How the Weekly Graph is Generated
The 7-day visual graph is generated client-side by `buildMoodChart()` in `app.js`:
1. Fetches historical `Insight` array via `GET /api/insights/`.
2. Constructs a date bucket array for the trailing 7 days (`Mon`, `Tue`, `Wed`, `Thu`, `Fri`, `Sat`, `Sun`).
3. Groups all `sentiment_score` values by day date string.
4. Computes the average sentiment score per day.
5. Calculates bar height percentage: `h = Math.max(12, Math.round(((avg + 1) / 2) * 100))`.
6. Dynamically renders color-coded column bars:
   - `avg >= 0.35`: Emerald Green (`#10b981` — Positive)
   - `avg <= -0.35`: Rose Red (`#f87171` — Negative)
   - Otherwise: Indigo (`#6366f1` — Neutral / Mixed)

---

### 7. How AI Insights Consume Mood Data
1. When `POST /api/journal/` runs, `create_insight_from_journal(journal)` receives the text.
2. **Tier-1 NLP Engine**: Sends text to HuggingFace Inference API (`j-hartmann/emotion-english-distilroberta-base` & `cardiffnlp/twitter-roberta-base-sentiment-latest`).
3. **Tier-2 Fallback Engine**: If offline, evaluates VADER sentiment analyzer & keyword banks (`EMOTION_BANKS`).
4. Extracts top emotion tags and keywords.
5. Generates a personalized mental health recommendation message.
6. Saves a new `Insight` object into PostgreSQL/SQLite, immediately available via `GET /api/insights/`.

---

### 8. Current Backend Readiness
- **Backend Status**: **100% Fully Supported & Functional**.
- **New Backend Work Required**: **Zero**.
- The existing models (`JournalEntry`, `Insight`), APIs (`/api/journal/`, `/api/insights/`), and NLP engine (`apps.insights.engine`) already completely power daily mood check-ins, weekly trend graphs, and AI recommendations.
