# SoulCare Community Sanctuary — Find Peers Filter & Tab Reset Bug Report

---

### 1. Root Cause Analysis

| Component | Investigation Finding | Diagnostic Result |
| :--- | :--- | :--- |
| **Backend API (`GET /api/support/users/`)** | Inspected `available_users` in `backend/apps/support/views.py` (lines 30–92). The backend excludes **ONLY** active connections (`SupportConnection.STATUS_ACTIVE`) and self (`user.id`). It does **NOT** filter out pending requests. | ✅ **Backend payload is correct.** Candidate users with pending requests are returned in the JSON payload. |
| **Frontend Renderer (`renderFindUsers`)** | Inspected `renderFindUsers(users)` in `backend/web/static/web/app.js` (lines 771–815). `renderFindUsers` filters out **ONLY** users present in `supportData.connections`. Users with pending requests in `supportData.sent` are **retained** and rendered with `🟡 Waiting for response` + `[ Cancel Request ]`. | ✅ **Filtering logic is correct.** |
| **Frontend Tab Controller (`loadSupport`)** | Inspected `loadSupport()` in `backend/web/static/web/app.js` at **Line 588**. `loadSupport()` contained a hardcoded call to `supportTab('connections')`. | 🔴 **EXACT ROOT CAUSE FOUND.** Every time `sendRequest()` finished and called `loadSupport()`, Line 588 forced a tab switch to `connections`, hiding the Find Peers DOM panel (`#d-support-find`) and giving the appearance that the peer card disappeared. |

---

### 2. File, Function, and Line Details

- **File**: [backend/web/static/web/app.js](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/web/static/web/app.js)
- **Function**: `loadSupport()`
- **Exact Line**: **Line 588**

#### Original Problem Code:
```javascript
// app.js Line 587
async function loadSupport(){
  supportTab('connections') // <--- HARDCODED TAB RESET (Root Cause)
  ...
```

#### Corrected Production Code:
```javascript
// app.js Line 587
async function loadSupport(){
  supportTab(activeSupportTab || 'connections') // <--- PRESERVES ACTIVE TAB
  ...
```

---

### 3. State Machine & User Journey Verification

1. **User Action**: User searches for a peer on the **Find Peers** tab and clicks `＋ Connect`.
2. **Execution**: `sendRequest(uid, uname)` issues `POST /api/support/send/<uid>/` and calls `loadSupport()`.
3. **Data Refresh**: `loadSupport()` re-fetches `connections`, `requests`, `sent`, and `users`.
4. **Tab Context Retention**: `loadSupport()` preserves `activeSupportTab = 'find'`, keeping `#d-support-find` visible.
5. **Render Output**:
   - The peer card **remains visible** in Find Peers.
   - The button state updates instantly to `🟡 Waiting for response` &nbsp; **`[ Cancel Request ]`**.
   - Only peers with **ACCEPTED** connections are excluded from Find Peers.

---

### 4. Regression Test Results

- **`sendRequest()`**: ✅ Sent request creates pending invitation; card remains visible in Find Peers with `Waiting for response` + `Cancel Request`.
- **`cancelRequest()`**: ✅ Cancelling removes item from Sent Requests and resets Find Peers card back to `＋ Connect`.
- **`acceptRequest()`**: ✅ Accepting request moves peer to active Connections and removes from Find Peers.
- **`rejectRequest()`**: ✅ Rejecting request resets peer card back to `＋ Connect`.
- **Connections & Chat**: 🔒 Untouched and 100% operational.

---
*Find Peers Filtering & Tab Preservation Fix Completed & Verified.*
