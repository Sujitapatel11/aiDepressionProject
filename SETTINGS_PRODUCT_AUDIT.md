# SoulCare Settings — Product Feature & Reality Audit

---

### Executive Summary
This audit inspects every feature in the SoulCare Settings Control Center against backend REST APIs, Django authentication models, and client session state to ensure **zero fake toggles, zero synthetic settings, and 100% real control features.**

---

### Feature Audit Matrix Table

| Component Name | Current Data Source | API Endpoint | Backend Model | Business Rule | Status | Implementation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Account Details** | User Session | N/A | `django.contrib.auth.models.User` | Displays active account username and email address. | **Existing** | Rendered inside `#settings-username` and `#settings-email`. |
| **Password Reset Link** | `password_reset_api` | `POST /api/auth/password/reset/` | `django.contrib.auth.models.User` | Sends automated password reset email token to registered email address. | **Existing** | Triggered via "Send Password Reset Email" action button. |
| **Local Draft Storage** | `handleJournalInput()` | `localStorage` | Client-side Session | Manages local reflection draft persistence (`sc_journal_draft`). | **Existing** | Displays active local draft storage status with clear cache option. |
| **Data Privacy Policy** | Security Policy | N/A | N/A | Displays end-to-end privacy and encryption policy. | **Existing** | Information card confirming 100% private reflection logs. |
| **Secure Session Termination** | `logout()` | `POST /api/auth/logout/` | JWT Blacklist | Blacklists JWT refresh token and terminates active session. | **Existing** | Triggered via "Sign Out Securely" button. |

---

### Control Center Integrity Guarantee
1. **No Fake Toggles**: Excludes non-existent notification switches, synthetic dark mode toggles, or fake data export buttons.
2. **Real Authentication Control**: Password resets use Django's native `default_token_generator` and `send_mail` infrastructure.
