# SoulCare Chat — Product Feature & Reality Audit

---

### Executive Summary
This audit evaluates every feature in the SoulCare Chat messaging engine against Django Channels WebSockets (`ws/chat/<connId>/`), REST API endpoints (`GET /api/chat/<connId>/messages/`), and database models (`apps.chat.models.ChatMessage`) to enforce **zero fake social media mechanics and 100% real private 1-on-1 messaging.**

---

### Feature Audit Matrix Table

| Feature Name | Current Data Source | API Endpoint | WebSocket Event | Backend Model | Business Rule | Status | Implementation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Realtime Messaging** | WebSocket | `GET /api/chat/<id>/messages/` | `ws/chat/<connId>/` | `apps.chat.models.ChatMessage` | 2-way real-time 1-on-1 private messaging between connected peers. | **Existing** | Uses active Django Channels WebSocket connection with fallback REST history. |
| **Chat History Timeline** | `loadMessages()` | `GET /api/chat/<id>/messages/` | N/A | `apps.chat.models.ChatMessage` | Fetches non-deleted chat history for active connection sorted by timestamp. | **Existing** | Rendered inside `#d-chat-messages` and `#m-chat-messages`. |
| **Peer Connection Status** | `ws.onopen / ws.onclose` | N/A | WebSocket Open/Close | Connection State | Displays "Online" when WebSocket connects, "Disconnected" when closed. | **Existing** | Updates `#d-chat-status` and `#d-chat-online` indicator dot. |
| **Typing Indicators** | `sendTyping()` | N/A | `{type: "typing"}` | Client Signal | Signals active typing to peer over WebSocket. | **Existing** | Supported via WebSocket `type: "typing"` signal handler. |
| **Disconnect Peer** | `disconnectConn()` | `POST /api/support/connections/<id>/disconnect/` | N/A | `apps.support.models.SupportConnection` | Terminates connection and closes active chat session. | **Existing** | Triggered via three-dot peer options menu. |
| **Block Peer** | `blockConn()` | `POST /api/support/connections/<id>/block/` | N/A | `apps.support.models.SupportConnection` | Blocks peer from further communication. | **Existing** | Triggered via three-dot peer options menu. |
| **Inspiring Empty State** | `openChat()` in `app.js` | N/A | N/A | N/A | Renders *"💜 Start your first supportive conversation."* when 0 messages exist. | **Existing** | Never displays synthetic or simulated messages. |

---

### Safety & Trust Guarantees
1. **No Addictive Popularity Mechanics**:
   - Zero read receipts pressure, zero public streaks, no follower counts, and no engagement badges.
2. **Private & Encrypted Sanctuary**:
   - Communication is strictly 1-on-1 between mutually accepted peer connections.
3. **Respectful Communication Principles**:
   - Designed for emotional support, mutual empathy, and comfortable, distraction-free messaging.
