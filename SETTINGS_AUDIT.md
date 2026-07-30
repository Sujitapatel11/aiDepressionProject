# ⚙️ SoulCare Settings Page Comprehensive Audit & Technical Report

**Audit Date**: July 30, 2026  
**Auditor**: Senior Software Engineer & UX Specialist  
**Target Component**: Settings Control Center (`index.html` & `app.js`)  
**Overall Status**: **PARTIAL / NEEDS HARDENING**

---

## 1. Executive Summary

An audit of the **SoulCare Settings Control Center** was conducted across frontend templates (`backend/web/templates/web/index.html`), client JavaScript logic (`backend/web/static/web/app.js`), and backend REST APIs (`apps.accounts`, `apps.authentication`).

While basic user display and password reset triggers are present, critical UX gaps exist: **mobile settings view (`id="mob-settings"`) is entirely missing from HTML**, password reset fabricates an invalid `@soulcare.app` email address, and functions like `clearLocalDrafts()` are dead/unlinked in the UI.

---

## 2. Detailed Setting-by-Setting Breakdown

### 1. Username Display
* **Status**: Exists
* **Current Behaviour**: Populates `<span id="settings-username">` via `loadProfile()` using `localStorage.getItem('sc_user')`.
* **UI Issues**: Displays as read-only static text without copy button or profile edit modal trigger.
* **UX Issues**: Users cannot update or edit their display username from Settings.
* **Backend Integration Status**: Read-only from local storage session.
* **API Endpoint**: `GET /api/accounts/profile/` (Available in Django, unused in Settings view).
* **Database Support**: Supported (`User.username`).
* **Priority**: **Recommended**

---

### 2. Email Address Display & Management
* **Status**: **Missing**
* **Current Behaviour**: Preserved comment references `id="settings-email"`, but the HTML element `<span id="settings-email">` does not exist in `index.html`.
* **UI Issues**: Email address is completely absent from the Settings screen.
* **UX Issues**: User has no visibility into which email address is registered for security notifications.
* **Backend Integration Status**: None.
* **API Endpoint**: `GET /api/accounts/profile/` (Contains email field, not bound to UI).
* **Database Support**: Supported (`User.email`).
* **Priority**: **Critical**

---

### 3. Account Security Status Badge
* **Status**: Exists (Static Placeholder)
* **Current Behaviour**: Displays a static green dot with label `"Active & Authenticated"`.
* **UI Issues**: Hardcoded static HTML element.
* **UX Issues**: Always displays "Active & Authenticated", even if token session is expired or unverified.
* **Backend Integration Status**: None (pure client-side static template).
* **API Endpoint**: None.
* **Database Support**: None.
* **Priority**: **Optional**

---

### 4. Password Reset Trigger
* **Status**: Exists (Buggy Implementation)
* **Current Behaviour**: Clicking `"Send Password Reset Email →"` triggers `requestPasswordResetLink()`, sending `POST /auth/password/reset/` with body `{email: username + '@soulcare.app'}`.
* **UI Issues**: Lack of loading spinner or button disabled state during API call.
* **UX Issues**: Fabricates a fake email address (`username@soulcare.app`) instead of using the user's real registered email, causing backend email sending to fail for real users.
* **Backend Integration Status**: Endpoint connected, but payload payload parameters are broken.
* **API Endpoint**: `POST /auth/password/reset/`
* **Database Support**: Supported.
* **Priority**: **Critical**

---

### 5. Privacy & Local Data Sanctuary Overview
* **Status**: Exists (Informational Text)
* **Current Behaviour**: Static bullet points detailing zero-popularity tracking, draft protection, and encrypted journaling.
* **UI Issues**: Passive text list with no interactive privacy controls.
* **UX Issues**: Users expect actionable privacy controls (e.g. data export, clear cache, session revoking).
* **Backend Integration Status**: None.
* **API Endpoint**: None.
* **Database Support**: N/A.
* **Priority**: **Recommended**

---

### 6. Mobile Settings View (`id="mob-settings"`)
* **Status**: **Missing (Critical Bug)**
* **Current Behaviour**: `showMobTab('settings')` attempts to activate `el('mob-settings')`, but the container does not exist in `index.html`.
* **UI Issues**: Tapping "Settings" on mobile devices results in a completely blank/empty screen.
* **UX Issues**: Mobile users are entirely locked out of settings functions.
* **Backend Integration Status**: N/A.
* **API Endpoint**: N/A.
* **Database Support**: N/A.
* **Priority**: **Critical**

---

### 7. Clear Local Journal Draft Cache
* **Status**: **Dead Function**
* **Current Behaviour**: Function `clearLocalDrafts()` exists in `app.js` (line 1090), but no button on the Settings page calls it.
* **UI Issues**: Unlinked functionality.
* **UX Issues**: Users cannot manually purge local browser drafts.
* **Backend Integration Status**: N/A (Client-side localStorage).
* **API Endpoint**: N/A.
* **Database Support**: N/A.
* **Priority**: **Recommended**

---

### 8. Notification Preferences (Push / Email / In-App)
* **Status**: **Missing**
* **Current Behaviour**: No notification setting controls exist.
* **UI Issues**: Absent.
* **UX Issues**: Cannot toggle daily reminder alerts or peer request notifications.
* **Backend Integration Status**: Missing.
* **API Endpoint**: None.
* **Database Support**: None.
* **Priority**: **Recommended**

---

### 9. Dark Mode / Theme Preferences
* **Status**: **Missing**
* **Current Behaviour**: App relies on hardcoded CSS variables / system theme without manual toggle.
* **UI Issues**: Absent.
* **UX Issues**: Users experiencing distress or late-night journaling cannot toggle custom dark/light themes.
* **Backend Integration Status**: None.
* **API Endpoint**: None.
* **Database Support**: None.
* **Priority**: **Optional**

---

### 10. Account Deletion & Data Export (GDPR / Health Privacy)
* **Status**: **Missing**
* **Current Behaviour**: No feature exists for account deletion or downloading personal journal archive.
* **UI Issues**: Absent.
* **UX Issues**: Essential requirement for mental health applications.
* **Backend Integration Status**: Missing.
* **API Endpoint**: None.
* **Database Support**: Needs cascading delete handler.
* **Priority**: **Critical**

---

## 3. Systematic Defect & Pattern Analysis

### 🔴 Dead Buttons & Unlinked Functions
1. **`clearLocalDrafts()`**: Function defined in `app.js:1090`, but no UI button exists on the Settings page to trigger it.

### ⚠️ Placeholder Features & Hardcoded Assumptions
1. **Fake Email Domain**: `requestPasswordResetLink()` constructs `email: username + '@soulcare.app'`, failing if the user registered with a real email address (e.g. `user@gmail.com`).
2. **Security Badge**: Static HTML badge always displaying "Active & Authenticated".

### 🚫 Missing Validation, Loading States & Error Handling
1. **Password Reset Error Handling**: `requestPasswordResetLink()` fires `showToast('Password reset request processed. Check your inbox.')` regardless of whether `res.ok` is true or false.
2. **Missing Loading Indicators**: Button remains active during network requests; double-clicking fires duplicate API calls.
3. **Missing Mobile Container**: `id="mob-settings"` missing from DOM entirely.

---

## 4. Priority Remediation Roadmap

| Defect / Missing Setting | Category | Priority | Action Item |
| :--- | :--- | :--- | :--- |
| **Mobile Settings Container** | Mobile Bug | **Critical** | Add `<div id="mob-settings">` matching desktop settings layout in `index.html`. |
| **Password Reset Email Payload** | Bug Fix | **Critical** | Pass user's actual registered email address instead of string concatenation. |
| **Password Reset Toast & Loading** | Error Handling | **Critical** | Disable button on click, handle `!res.ok` errors with explicit error toasts. |
| **Email Address Display** | Missing Feature | **Critical** | Render `<span id="settings-email">` and populate from user profile API. |
| **Unlinked `clearLocalDrafts()`** | Dead Code | **Recommended** | Add a "Clear Local Drafts" button under Privacy section calling `clearLocalDrafts()`. |
| **Account Deletion / Data Export** | Privacy / Compliance | **Critical** | Implement account deletion modal and journal CSV/JSON export. |
