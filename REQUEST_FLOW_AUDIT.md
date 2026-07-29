# SoulCare Community Sprint — Step 1: Request Flow Audit Report

---

### Executive Summary
This report documents the UI and presentation layer refactoring for the **Community Support Request Flow** (Incoming, Sent, Pending, Accepted, and Declined states). The underlying Django models, REST API endpoints (`/api/support/requests/`, `/api/support/requests/sent/`), authentication rules, and business logic (`acceptRequest`, `rejectRequest`) remain **100% untouched**.

---

### 1. Problems Found

| Issue Area | Problem Description | Impact on User Experience |
| :--- | :--- | :--- |
| **Incoming Request Hierarchy** | Generic button styling (`btn-blue` / `btn-gray`) with low contrast. | Users could accidentally click decline or miss incoming connection invites. |
| **Sent Request Status** | Static `Pending` text badge without explanation. | User did not know what happens while waiting for a peer response. |
| **Empty State Guidance** | Minimalist `📭 All caught up` placeholder without actionable links. | Stranded users with zero pending requests without directing them to find peers. |
| **Card Geometry & Spacing** | Basic inline flex items with tight vertical padding. | Visual inconsistency compared to $24\text{px}$ rounded cards on Dashboard, Journal, and Sleep. |

---

### 2. UI Improvements Made

1. **Incoming Request Cards**:
   - Upgraded to $24\text{px}$ rounded glassmorphism cards with soft purple borders (`border-purple-100`).
   - Added descriptive caption: *"Invited you to connect for 1-on-1 peer support."*
   - Replaced plain buttons with prominent **Accept Connection** (`bg-purple-600 hover:bg-purple-700 text-white font-bold`) and **Decline** (`bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold`) CTAs.

2. **Sent Request Cards**:
   - Added explanatory caption: *"Connection invitation sent. Awaiting peer confirmation."*
   - Replaced static text with an animated pulse status badge (`🟡 Invitation Pending`).

3. **Onboarding Empty State**:
   - Replaced plain text with a centered $28\text{px}$ glassmorphism onboarding card:
     > 📬 **No Pending Support Requests**
     > *When a peer invites you to connect, or when your sent invitations are accepted, updates will appear here.*
     > `[ Explore Peer Directory → ]` (routes directly to `supportTab('find')`).

4. **Mobile & Desktop Responsive Layout**:
   - Enforced flexible flex-wrap button layouts preventing text truncation on 320px mobile viewports.

---

### 3. Files Modified

- **[app.js](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/web/static/web/app.js)**: Refactored `renderRequests()` presentation template.
- **[REQUEST_FLOW_AUDIT.md](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/REQUEST_FLOW_AUDIT.md)**: Created audit report.

---

### 4. Regression Test Results

- **`GET /api/support/requests/`**: ✅ Incoming requests list fetches correctly.
- **`GET /api/support/requests/sent/`**: ✅ Sent requests list fetches correctly.
- **`POST /api/support/requests/<id>/accept/`**: ✅ `acceptRequest()` accepts invitation and moves user to active Connections.
- **`POST /api/support/requests/<id>/reject/`**: ✅ `rejectRequest()` declines invitation cleanly.
- **Desktop & Mobile Rendering**: ✅ Tested and verified layout integrity.

---

### Next Action Status
Step 1 Request Flow polish is complete. **Waiting for further instructions** before proceeding to Step 2!
