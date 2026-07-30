# Recommendation Diversity & Candidate Rotation Architecture Audit

This document presents a technical audit of SoulCare's Peer Support recommendation engine, evaluating item freshness, candidate rotation, discovery for new users, and production-safe diversity strategies.

---

## Executive Summary & Direct Answers

### 1. If the same user opens the Peer Support page 10 times without database changes, will they receive the exact same ordering every time?
- **YES.** Sorting in [`available_users`](file:///c:/Users/sujit/OneDrive/Desktop/aiDepressionProject/backend/apps/support/views.py#L92) is 100% deterministic (`-has_profile`, `-match_score`, `-last_login`). With static database state, the API returns the identical candidate sequence on every request.

### 2. Does the current algorithm contain any randomness?
- **NO.** There are no pseudo-random seeds, shuffling steps, or stochastic tie-breakers.

### 3. Does it rotate recommendations?
- **NO.** There is no pagination offset, session-based rotation, or recommendation sliding window.

### 4. Can the same top 5 users remain unchanged for weeks?
- **YES.** If no candidate updates their journal or logs in, the exact same top 5 peers remain fixed at the top of the user's recommendations indefinitely.

### 5. Is there any exploration mechanism for new users?
- **NO.** There is no Multi-Armed Bandit, $\epsilon$-greedy exploration, or freshness boost for newly registered accounts.

### 6. Is there any diversity mechanism?
- **NO.** No variance penalties, category caps, or diversity re-ranking algorithms are present.

### 7. Can newly joined users realistically appear in recommendations?
- **NO (or rarely).** Unprofiled new users have `has_profile = False` (putting them at the bottom of candidate lists). Even after writing 3 journals, if their calculated compatibility score is lower than established users, they remain buried.

### 8. Does recommendation history exist anywhere?
- **NO.** The system does not log or persist which candidates were previously displayed to a user.

### 9. Is there any "recently shown" tracking?
- **NO.** There are no Redis sets, database tables, or session trackers for candidate impressions.

### 10. Is recommendation caching used?
- **NO.** Results are dynamically computed on every HTTP request by executing SQL queries and in-memory Cosine Similarity.

### 11. What are the possible negative effects of always returning identical results?
- **User Fatigue & Monotony:** The requester sees the exact same card stack every single day.
- **Over-exposure of Top Matches:** A small percentage of top-matched peers receive a high volume of connection requests, while viable peers receive zero visibility.
- **Isolation of New Members:** Newly registered users are rarely discovered or sent support requests.
- **Dead-end Stagnation:** If a top-ranked peer is inactive or declines requests, the requester is repeatedly presented with the same unresponsive match.

### 12. Without changing the OCEAN algorithm, recommend the safest way to introduce recommendation diversity
- **Recommended Strategy:** **Daily Deterministic Session Jitter + Soft Impression Capping**.
  - **Daily Deterministic Jitter:** Introduce a tiny, deterministic daily hash modifier to the tertiary sorting key (e.g. `hash(user_id + candidate_id + current_date)`). This slightly rotates candidates with equal or close match scores every 24 hours without adding random noise within a single session.
  - **Soft Impression Penalty:** Track displayed recommendations in Redis cache and temporarily demote candidates displayed $N$ consecutive times without interaction.

---

## Current Behaviour

```
Query Candidates (auth_user EXCLUDE active connections)
                        │
                        ▼
    Compute Cosine Similarity (OCEAN Vector)
                        │
                        ▼
Deterministic Sort Key: (-has_profile, -match_score, -last_login)
                        │
                        ▼
Static Candidate List Returned (100% Deterministic & Static)
```

- **Primary Order:** `has_profile` (Users with calculated OCEAN profiles first).
- **Secondary Order:** `match_score` (Highest compatibility percentage first).
- **Tertiary Order:** `last_login` (Most recently active user first).

---

## Weaknesses

1. **Zero Rotation:** Candidates never rotate unless a user's `last_login` or journal profile changes.
2. **Cold-Start Penalty for New Users:** New accounts remain invisible to the community until they write at least 3 journals and achieve a high compatibility score.
3. **Winner-Take-All Distribution:** Top-scoring users absorb almost 100% of incoming peer requests.

---

## User Experience Impact

| Dimension | Impact Level | Description |
| :--- | :--- | :--- |
| **Engagement** | **Negative** | Repeatedly seeing the same 5 faces creates perception of a dead/inactive platform. |
| **Connection Speed** | **Negative** | If top matches do not accept requests, user has no easy way to discover alternative peers. |
| **New User Retention** | **Critical** | New members feel ignored because their profiles never surface to existing peers. |
| **System Fairness** | **Negative** | Load distribution across potential support peers is heavily skewed toward early adopters. |

---

## Possible Strategies

### Strategy 1: Random Shuffling / Noise Injection
- **Description:** Add uniform random noise $\epsilon \in [-5, +5]$ to match scores on every request.
- **Pros:** Highly dynamic.
- **Cons:** **Unsafe for production.** Destroys recommendation determinism, degrades match quality, and causes layout flickering when refreshing the page within seconds.

### Strategy 2: Impression-Based Frequency Capping (Redis-backed)
- **Description:** Track shown user IDs in Redis (`impressions:user_id`). Demote candidates displayed $>5$ times without a connection request.
- **Pros:** Prevents dead-end stagnation; forces system to show fresh peers.
- **Cons:** Requires Redis state management and impression tracking API calls.

### Strategy 3: Daily Deterministic Rotation (Recommended)
- **Description:** Inject a daily deterministic salt into candidate ordering for tied or near-tied match scores:
  $$\text{SortKey} = \big(-\text{has\_profile}, \ -\text{match\_score}, \ -\text{last\_login\_epoch}, \ \text{hash}(\text{user\_id} + \text{candidate\_id} + \text{today\_date})\big)$$
- **Pros:** 100% deterministic within the same day, zero layout flicker, zero additional DB queries, preserves OCEAN match scores, automatically rotates candidate presentation every 24 hours.

---

## Recommended Strategy: Daily Deterministic Rotation + Soft New-User Boost

1. **Preserve Match Accuracy:** The primary metric remains `match_score` (derived from OCEAN vector Cosine Similarity).
2. **Preserve API Response:** `match_score` percentage (e.g. `92%`) is displayed unchanged.
3. **Daily Rotation for Near-Ties:** Use a daily deterministic hash as a 4th sorting key. Candidates with identical or close match scores swap positions smoothly once every 24 hours.
4. **Soft New-User Exploration:** Give accounts registered within the last 7 days a neutral baseline score boost equal to candidate average, ensuring new members surface in discovery lists.

---

## Migration Difficulty

- **Complexity Level:** **VERY LOW**
- **Database Changes:** None.
- **Schema Changes:** None.
- **API Impact:** None (ordering improves while response format and match scores stay identical).

---

## Risk Assessment

| Risk | Severity | Mitigation |
| :--- | :--- | :--- |
| **Degradation of Match Quality** | Low | Diversity logic acts ONLY as a tertiary/quaternary tie-breaker after OCEAN compatibility scoring. |
| **Layout Flickering** | Low | Daily deterministic hash guarantees stable ordering within any 24-hour window. |
| **Privacy Leakage** | Zero | No extra user data or vectors are exposed. |

---
*Audit complete. No code modifications or implementation executed.*
