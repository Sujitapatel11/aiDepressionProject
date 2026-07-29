# SoulCare Community — Root Cause Investigation: Disappearing Peer Issue

---

### Executive Overview
This document presents the full root-cause diagnosis for the bug where sending a connection request (`＋ Connect`) causes the peer card to immediately disappear from the **Find Peers** directory.

**Crucial Finding**: The peer is **NOT** being filtered out of the backend dataset or database query. Instead, calling `loadSupport()` immediately after sending a request executes a hardcoded tab reset `supportTab('connections')`, which forces the UI to switch tabs and **hide the entire Find Peers DOM container**.

---

### 1. Backend Analysis (`GET /api/support/users/`)

- **Target File**: [backend/apps/support/views.py](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/apps/support/views.py)
- **Target Function**: `available_users(request)` (Lines 30–92)
- **Query Logic**:
  ```python
  connected_ids = SupportConnection.objects.filter(
      Q(user_one=user) | Q(user_two=user),
      status=SupportConnection.STATUS_ACTIVE,
  ).values_list('user_one_id', 'user_two_id')

  excluded = {uid for pair in connected_ids for uid in pair}
  excluded.add(user.id)

  candidates = User.objects.exclude(id__in=excluded)
  ```
- **Backend Findings**:
  - `available_users` excludes **ONLY** active connections (`SupportConnection.STATUS_ACTIVE`) and the logged-in user (`user.id`).
  - **Does `available_users` exclude pending requests?** **NO.**
  - **Does it only return users without any `SupportRequest`?** **NO.** Candidate users with pending requests are **retained** in the API payload returned to the frontend.

---

### 2. Frontend Analysis (`loadSupport()`, `sendRequest()`, `supportTab()`)

- **Target File**: [backend/web/static/web/app.js](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/web/static/web/app.js)
- **Target Line**: **Line 588** inside `loadSupport()`

#### Exact Code Trace:
```javascript
// Line 587 in app.js
async function loadSupport(){
  supportTab('connections')  // <--- EXACT ROOT CAUSE LINE (Line 588)
  ...
```

#### Execution Chain on Clicking `＋ Connect`:
1. User clicks `＋ Connect` on a peer card in the Find Peers tab (`activeSupportTab === 'find'`).
2. `sendRequest(uid, uname)` issues `POST /api/support/send/<uid>/`.
3. Upon 200 OK success, `sendRequest` calls `loadSupport()`.
4. **Line 588 of `loadSupport()` executes `supportTab('connections')`**:
   - `supportTab('connections')` sets `activeSupportTab = 'connections'`.
   - It iterates over `.dsupport-panel` / `.msupport-panel` and adds the `hidden` CSS class to `#d-support-find` and `#m-support-find`.
   - It unhides `#d-support-connections` and `#m-support-connections`.
   - It calls `renderSupportTab()`, which routes to `renderConnections()`.
5. **Result**: The entire Find Peers DOM container is hidden from the user's viewport and replaced with the Chats/Connections view. To the user, the peer card appears to instantly disappear.

---

### 3. State Management Inspection

Before and after `sendRequest()` execution:

| State Variable | Value Before `sendRequest()` | Value After `sendRequest()` | Notes |
| :--- | :--- | :--- | :--- |
| `activeSupportTab` | `'find'` | `'connections'` | **Forced switch at Line 588** |
| `#d-support-find` DOM state | `visible` | `hidden` | **Hidden by `supportTab('connections')`** |
| `supportData.users` | Array of all candidates | Array of all candidates | Payload remains intact |
| `supportData.sent` | `[]` | `[{ to_user: { id: peer_id }, ... }]` | Correctly contains pending request |

---

### 4. Why Previous Fixes Failed

1. **Attempted Fixes Focused Only on `renderFindUsers()` Rendering**: Previous attempts modified the `map()` logic inside `renderFindUsers()`, assuming the peer was being filtered out during card rendering.
2. **Ignored the Tab Controller**: Because `loadSupport()` hardcoded `supportTab('connections')` at Line 588, `renderFindUsers()` was never even executed after data refreshes when `sendRequest()` completed.
3. **Hidden DOM Container**: The entire parent tab `#d-support-find` was being set to `display: none` (`hidden`), masking the fact that the candidate user data was still present in memory.

---

### 5. Summary Table of Root Cause

- **Root Cause**: `loadSupport()` hardcodes `supportTab('connections')` on Line 588 of `app.js`.
- **File**: `backend/web/static/web/app.js`
- **Function**: `loadSupport()`
- **Exact Line**: **Line 588** (`supportTab('connections')`)

---
*Investigation Complete. Standing by for confirmation before applying fix.*
