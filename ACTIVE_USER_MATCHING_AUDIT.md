# Active User Prioritization Architecture Audit: Peer Support Matching

This audit evaluates whether SoulCare's Peer Support suggestion pipeline prioritizes active users, analyzes available database signals, and outlines production-safe improvements to prevent dormant accounts from topping recommendation lists.

---

## Executive Summary & Direct Answers

### 1. Is the user's last login considered?
- **NO.** `User.last_login` is not queried or evaluated anywhere in [`available_users`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/apps/support/views.py#L30).

### 2. Is the user's last journal date considered?
- **NO.** The creation timestamp (`created_at`) of recent journals is not evaluated during candidate ranking.

### 3. Is the user's recent activity considered?
- **NO.** No activity metrics, event telemetry, or interaction recency scores are included in the recommendation query.

### 4. Is account inactivity considered?
- **NO.** Inactive or dormant accounts are not filtered out or penalized.

### 5. Can inactive users still rank first?
- **YES.** An inactive user who has not logged in for months will rank #1 if their pre-calculated `UserProfile` yields a higher Cosine Similarity `match_score` (e.g. 95%) than a user who logged in 5 minutes ago with a lower score (e.g. 80%).

### 6. Is there any decay applied to old personality profiles?
- **NO.** `UserProfile` stores static OCEAN trait values. No time-decay function (e.g., exponential half-life based on `updated_at`) is applied.

### 7. Is there any freshness score?
- **NO.** There is no recency weight, freshness multiplier, or timestamp modifier in the score calculation.

### 8. Is there any online/offline ranking?
- **NO.** Online/offline status is not tracked or used for sorting candidate lists.

### 9. Which database fields are available that could be used for activity ranking?
- `auth_user.last_login` (`DateTimeField` on Django's built-in `User` model).
- `auth_user.date_joined` (`DateTimeField` on Django's built-in `User` model).
- `auth_user.is_active` (`BooleanField` on Django's built-in `User` model).
- `support_userprofile.updated_at` (`DateTimeField` on `UserProfile`).
- `journal_journalentry.created_at` (`DateTimeField` on `JournalEntry`).

### 10. Simplest production-safe way to prioritize active users while keeping the OCEAN matching algorithm unchanged
- **Multi-Key Sorting (Zero Math Modification):**  
  Update the Python sort tuple in `available_users` to include a normalized `last_login` timestamp or active status boolean as a secondary/tertiary tie-breaker key:
  ```python
  results.sort(key=lambda x: (-int(x["has_profile"]), -x["match_score"], -x["last_login_epoch"]))
  ```
- **Active Pool Filtering:**  
  Filter candidates at the SQL level to require active account status within a reasonable window (e.g., `last_login >= now() - 30 days`), preserving the exact Cosine Similarity formula for all eligible active candidates.

---

## Current Behaviour

```
Query All Candidates (auth_user EXCLUDE active connections)
                       │
                       ▼
         Fetch UserProfile for Candidate
                       │
                       ▼
   Calculate Cosine Similarity(User, Candidate)
                       │
                       ▼
          Sort by (-has_profile, -match_score)
                       │
                       ▼
Return Candidate List (Activity & Timestamps Ignored)
```

1. Candidate candidates are fetched purely by excluding self and active connections (`SupportConnection.STATUS_ACTIVE`).
2. Match scores are computed exclusively from the 5 OCEAN floats on `UserProfile`.
3. Sorting relies strictly on `(-int(has_profile), -match_score)`.
4. Inactive accounts with older profiles remain perpetually at the top of candidate lists if their static personality vectors closely match the requester.

---

## Available Activity Signals

| Model | Field Name | Field Type | Signal Quality | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `auth_user` | `last_login` | `DateTimeField` | **High** | Indicates when the user last authenticated. |
| `auth_user` | `is_active` | `BooleanField` | **High** | Flag indicating if user account is enabled. |
| `auth_user` | `date_joined` | `DateTimeField` | Medium | Indicates account registration date. |
| `support_userprofile` | `updated_at` | `DateTimeField` | **High** | Indicates when personality profile was last updated. |
| `journal_journalentry` | `created_at` | `DateTimeField` | **High** | Indicates when the user last submitted a journal. |

---

## Weaknesses

1. **Dead Connection Requests:** Users may send peer support requests to dormant accounts who never log in to accept or respond.
2. **Frustrating User Experience:** Requester receives zero feedback because top-matched peers are inactive.
3. **Stale Personality Profiles:** Profiles generated months ago reflect past emotional states that may no longer be relevant today.
4. **Wasted UI Space:** Active users seeking peer support are pushed down the list below inactive accounts.

---

## Recommended Improvement

### Option A: SQL Pre-filtering (Recommended for High Scalability)
Filter the candidate QuerySet prior to vector calculations:
```python
cutoff = timezone.now() - timedelta(days=30)
candidates = User.objects.filter(
    is_active=True,
    last_login__gte=cutoff
).exclude(id__in=excluded)
```

### Option B: Multi-Key Sort (Preserves Candidate Visibility)
Include `last_login` epoch timestamp as a secondary key:
```python
results.sort(key=lambda x: (
    -int(x["has_profile"]),
    -x["match_score"],
    -x["last_login_timestamp"]
))
```

---

## Migration Difficulty

- **Complexity Level:** **VERY LOW**
- **Database Migrations Required:** None (`last_login` and `is_active` already exist on Django's built-in `User` model).
- **Risk Profile:** Zero risk to core algorithm; purely refines candidate selection and candidate sorting order.

---
*Audit complete. No code modifications executed.*
