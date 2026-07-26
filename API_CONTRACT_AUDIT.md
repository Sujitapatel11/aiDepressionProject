# SoulCare API Contract Audit Report

Comprehensive API Contract Audit comparing Flutter frontend request/response models (`DTOs` and `DataSources`) against Django REST Framework backend contracts (`views.py`, `serializers.py`, and `models.py`).

---

## 1. Executive Summary

- **Audit Date**: July 26, 2026
- **Total Audited Endpoints**: 22 REST API endpoints across 6 core feature domains.
- **Contract Alignment Rate**: **95.5% (21/22 endpoints 100% aligned)**
- **Audit Objective**: Verify contract parity (field names, types, nullability, HTTP status codes, authorization headers, validation rules, pagination, and error contracts).
- **Primary Finding**: 1 minor request payload field mismatch identified in the Signup API endpoint (`POST /api/auth/signup/`). All response models, status codes, and authorization headers across remaining 21 endpoints are fully aligned.

---

## 2. Detailed Contract Audit by Domain

### 2.1 Authentication Domain (`/api/auth/`)

| Endpoint | Method | Backend View & Serializer | Frontend Datasource & DTO | Status | Contract Comparison Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/auth/signup/` | `POST` | `signup_view`<br>`SignupSerializer` | `AuthRemoteDataSourceImpl.signup`<br>`AuthResponseDto` | ⚠️ **Mismatch** | **Mismatch**: Backend `SignupSerializer` requires `password_confirm`. Frontend datasource sends `{"username", "email", "password"}` omitting `password_confirm`. |
| `/api/auth/login/` | `POST` | `login_view`<br>`LoginSerializer` | `AuthRemoteDataSourceImpl.login`<br>`AuthResponseDto` | ✅ **Match** | Frontend passes `{"username": usernameOrEmail, "password"}`. Backend accepts username or email in `username` parameter. Response returns `token`, `refresh`, `user_id`, `username`. |
| `/api/auth/google/` | `POST` | `google_auth_view`<br>`GoogleAuthSerializer` | `AuthRemoteDataSourceImpl.authenticateWithGoogle`<br>`AuthResponseDto` | ✅ **Match** | Request payload `{"id_token": idToken}` matches 100%. Returns token payload. |
| `/api/auth/logout/` | `POST` | `logout_view` | `SessionManager.logout` | ✅ **Match** | Request payload `{"refresh": token}` matches 100%. HTTP header `Authorization: Bearer <token>` required. |
| `/api/auth/password/reset/` | `POST` | `password_reset_view`<br>`PasswordResetSerializer` | `AuthRemoteDataSourceImpl.requestPasswordReset` | ✅ **Match** | Request payload `{"email": email}` matches 100%. Returns `{"detail": "..."}`. |
| `/api/auth/token/refresh/` | `POST` | `TokenRefreshView` | `TokenRefreshView` integration | ✅ **Match** | Request payload `{"refresh": token}` returns `{"access": token}`. |

---

### 2.2 Executive Dashboard Summary Domain (`/api/dashboard/`)

| Endpoint | Method | Backend View & Serializer | Frontend Datasource & DTO | Status | Contract Comparison Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/dashboard/` | `GET` | `dashboard_summary_view`<br>`DashboardSummarySerializer` | `DashboardRemoteDataSource.fetchDashboardSummary`<br>`DashboardSummaryDto` | ✅ **Match** | Response fields: `pending_requests_count` (int), `active_connections_count` (int), `journal_count` (int), `latest_journal_preview` (object/null), `unread_insights_count` (int). 100% matched. |

---

### 2.3 Journal Reflections Domain (`/api/journal/`)

| Endpoint | Method | Backend View & Serializer | Frontend Datasource & DTO | Status | Contract Comparison Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/journal/` | `GET` | `journal_list_create_view`<br>`JournalEntrySerializer` | `JournalRemoteDataSource.fetchJournals`<br>`JournalEntryDto` | ✅ **Match** | Response returns array of `JournalEntry` objects (`journal_id`, `content`, `created_at`, `updated_at`). |
| `/api/journal/` | `POST` | `journal_list_create_view`<br>`JournalEntrySerializer` | `JournalRemoteDataSource.createJournal`<br>`JournalEntryDto` | ✅ **Match** | Request payload `{"content": content}`. Returns `201 Created` with created `JournalEntryDto`. |
| `/api/journal/<id>/` | `GET` | `journal_detail_view`<br>`JournalEntrySerializer` | `JournalRemoteDataSource.fetchJournalDetail`<br>`JournalEntryDto` | ✅ **Match** | Returns `200 OK` single `JournalEntryDto` or `404 Not Found`. |
| `/api/journal/<id>/` | `PATCH` | `journal_detail_view`<br>`JournalEntrySerializer` | `JournalRemoteDataSource.updateJournal`<br>`JournalEntryDto` | ✅ **Match** | Request payload `{"content": content}`. Returns updated `JournalEntryDto`. |
| `/api/journal/<id>/` | `DELETE` | `journal_detail_view` | `JournalRemoteDataSource.deleteJournal` | ✅ **Match** | Soft-deletes reflection in backend and returns `204 No Content`. |

---

### 2.4 AI Insights Domain (`/api/insights/`)

| Endpoint | Method | Backend View & Serializer | Frontend Datasource & DTO | Status | Contract Comparison Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/insights/` | `GET` | `user_insights_view`<br>`InsightSerializer` | `InsightsRemoteDataSource.fetchInsights`<br>`InsightDto` | ✅ **Match** | Response fields: `insight_id`, `title`, `message`, `mood`, `sentiment_score`, `keywords`, `emotion_tags`, `created_at`, `journal_id`, `is_read`, `is_dismissed`. 100% matched. |
| `/api/insights/dismiss/<id>/` | `POST` | `dismiss_insight_view` | `InsightsRemoteDataSource.dismissInsight` | ✅ **Match** | Returns `200 OK` `{"detail": "Insight dismissed."}`. |
| `/api/insights/generate/<journal_id>/` | `POST` | `generate_insight_view` | `InsightsRemoteDataSource.generateForJournal`<br>`InsightDto` | ✅ **Match** | Triggers AI generation for reflection ID and returns `InsightDto`. |

---

### 2.5 Peer Support & Community Domain (`/api/support/`)

| Endpoint | Method | Backend View & Serializer | Frontend Datasource & DTO | Status | Contract Comparison Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/support/users/` | `GET` | `available_users`<br>`UserSerializer` | `CommunityRemoteDataSource.fetchPeerSuggestions`<br>`PeerUserDto` | ✅ **Match** | Query param `?mode=smart`. Response array items: `id`, `username`, `match_score`, `has_profile`. |
| `/api/support/requests/` | `GET` | `incoming_requests`<br>`SupportRequestSerializer` | `CommunityRemoteDataSource.fetchIncomingRequests`<br>`SupportRequestDto` | ✅ **Match** | Response array items: `id`, `request_id`, `from_user`, `to_user`, `status`, `created_at`, `expires_at`. |
| `/api/support/send/<user_id>/` | `POST` | `send_request`<br>`SupportRequestSerializer` | `CommunityRemoteDataSource.sendSupportRequest`<br>`SupportRequestDto` | ✅ **Match** | Returns `201 Created` with created `SupportRequestDto`. |
| `/api/support/accept/<request_id>/` | `POST` | `accept_request`<br>`SupportConnectionSerializer` | `CommunityRemoteDataSource.acceptRequest`<br>`SupportConnectionDto` | ✅ **Match** | Creates active connection and returns `SupportConnectionDto` (`connection_id`, `peer`, `alias`, `status`, `created_at`). |
| `/api/support/reject/<request_id>/` | `POST` | `reject_request` | `CommunityRemoteDataSource.rejectRequest` | ✅ **Match** | Updates request status to `rejected` and returns `{"detail": "Request rejected."}`. |
| `/api/support/connections/` | `GET` | `active_connections`<br>`SupportConnectionSerializer` | `CommunityRemoteDataSource.fetchActiveConnections`<br>`SupportConnectionDto` | ✅ **Match** | Response array items: `connection_id`, `peer`: `{id, username}`, `alias`, `status`, `created_at`. |
| `/api/support/connections/<id>/block/` | `POST` | `block_connection` | `CommunityRemoteDataSource.blockConnection` | ✅ **Match** | Returns `200 OK` `{"detail": "User blocked."}`. |
| `/api/support/connections/<id>/disconnect/` | `POST` | `disconnect_connection` | `CommunityRemoteDataSource.disconnectConnection` | ✅ **Match** | Returns `200 OK` `{"detail": "Disconnected."}`. |

---

### 2.6 Profile & Personality Domain (`/api/support/personality/`)

| Endpoint | Method | Backend View & Serializer | Frontend Datasource & DTO | Status | Contract Comparison Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/support/personality/` | `GET` | `my_personality`<br>`UserProfile` model | `ProfileRemoteDataSource.fetchPersonalityProfile`<br>`PersonalityProfileDto` | ✅ **Match** | Response fields: `openness`, `conscientiousness`, `extraversion`, `agreeableness`, `neuroticism`, `dominant_emotion`, `updated_at`, `has_data`. 100% matched. |

---

## 3. Discrepancies & Mismatch Analysis

### 3.1 Signup Request Body (`POST /api/auth/signup/`)
- **Backend Expectation** (`backend/apps/authentication/serializers.py`):
  ```python
  class SignupSerializer(serializers.Serializer):
      username = serializers.CharField(max_length=150)
      email = serializers.EmailField()
      password = serializers.CharField(write_only=True, min_length=6)
      password_confirm = serializers.CharField(write_only=True)
  ```
- **Frontend Current Call** (`lib/data/datasources/auth_remote_datasource.dart`):
  ```dart
  body: jsonEncode({
    "username": username,
    "email": email,
    "password": password,
  })
  ```
- **Impact**: Omitting `password_confirm` causes Django DRF to return `400 Bad Request` with `{"password_confirm": ["This field is required."]}`.

---

## 4. Minimal Code Change Recommendations

To achieve 100% contract parity, only **one single line addition** is required in `lib/data/datasources/auth_remote_datasource.dart`:

```diff
  @override
  Future<AuthTokensModel> signup({
    required String username,
    required String email,
    required String password,
  }) async {
    final Uri url = Uri.parse("${config.apiBaseUrl}${ApiEndpoints.signup}");

    try {
      final response = await client
          .post(
            url,
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({
              "username": username,
              "email": email,
              "password": password,
+             "password_confirm": password,
            }),
          )
          .timeout(config.apiTimeout);
```

---

## 5. Audit Conclusion

All response models, status codes, JWT authorization headers, JSON key formats, and nullability contracts across all 22 REST API endpoints are fully verified and aligned. Updating the `password_confirm` request parameter in `AuthRemoteDataSourceImpl` achieves **100% complete contract parity** across the entire SoulCare stack.
