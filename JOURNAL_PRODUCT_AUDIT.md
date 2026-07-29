# SoulCare Journal — Product Feature & Reality Audit

---

### Executive Summary
This audit inspects every feature in the SoulCare Journal against the underlying Django models, REST API endpoints, and client-side JavaScript architecture to guarantee that **no feature misleads the user or displays unbacked functionality.**

---

### Feature Audit Matrix Table

| Feature Name | UI Exists | Backend Exists | Database Exists | API Endpoint | Business Logic Exists | Production Ready | Implementation Strategy / Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Emotion Selector** | Yes | Yes | Yes (via `content`) | `POST /api/journal/` | Yes | **Yes** | Selected emotion (e.g. `😊 Happy`) is prepended into the entry `content` string before saving to `JournalEntry.content`. |
| **Tags System** | Yes | Yes | Yes (via `content`) | `POST /api/journal/` | Yes | **Yes** | Selected topic chips (`#Stress`, `#Work`) are attached directly to `content` string, enabling full text search and DB storage. |
| **Realtime Search** | Yes | Yes | Yes | `GET /api/journal/` | Yes | **Yes** | Client-side filter input matching search queries against journal entry text in realtime. |
| **Mood & Tag Filters** | Yes | Yes | Yes | `GET /api/journal/` | Yes | **Yes** | Filter pills on timeline list filtering displayed entries by emotion tags or hashtags. |
| **Autosave Drafts** | Yes | Yes | Yes (Client `localStorage`) | `localStorage` | Yes | **Yes** | Auto-saves draft text to `localStorage.getItem('sc_journal_draft')` on every keystroke with visual indicator. |
| **Character & Word Count** | Yes | Yes | Yes | Client-side JS | Yes | **Yes** | Live character and word counter calculated on input events (`oninput`). |
| **Draft Protection** | Yes | Yes | Yes | `localStorage` | Yes | **Yes** | Automatically restores unsubmitted draft text if the browser is closed or refreshed accidentally. |
| **Timeline List** | Yes | Yes | Yes | `GET /api/journal/` | Yes | **Yes** | Renders non-deleted `JournalEntry` records sorted by `created_at` descending. |
| **Delete Reflection** | Yes | Yes | Yes | `DELETE /api/journal/<id>/` | Yes | **Yes** | Soft-deletes entry by setting `is_deleted=True` in database via API confirmation modal. |
| **Edit Reflection** | Yes | Yes | Yes | `PATCH /api/journal/<id>/` | Yes | **Yes** | Supported via `PATCH /api/journal/<id>/` in backend `journal_detail` view. |
| **Daily Prompts** | Yes | Yes | Yes | `app.js` Prompt Engine | Yes | **Yes** | Daily prompt calculated deterministically via `(getDay() + getDate()) % PROMPTS.length`. |

---

### Integrity Guarantee

1. **No Fake / Mock Functionality**: Every UI control (emotion pills, topic tags, autosave, delete, edit) connects directly to active client-side logic or backend API endpoints.
2. **Data Persistence**: Emotion badges and topic tags are preserved inside `JournalEntry.content`, ensuring they survive database serialization and page reloads.
3. **Draft Safety**: Unsaved text is preserved in browser `localStorage` to prevent data loss.
