# Requirements Document

## Introduction

MindSpace is a privacy-first emotional wellness Flutter mobile application that connects to an existing Django/Channels backend. The app provides five core features: a home dashboard, private journaling, AI-generated emotional insights, anonymous peer support, and real-time chat. The Flutter app is a pure client — it holds no business logic, performs no AI processing, and stores no sensitive data locally beyond a short-lived auth token. All persistent state lives on the Django backend.

## Glossary

- **App**: The MindSpace Flutter mobile application
- **ApiService**: The Flutter service layer responsible for all HTTP REST communication with the backend
- **WebSocketService**: The Flutter service responsible for managing WebSocket connections
- **AuthCubit**: The BLoC/Cubit managing authentication state
- **HomeCubit**: The BLoC/Cubit managing home dashboard state
- **JournalCubit**: The BLoC/Cubit managing journal state
- **InsightsCubit**: The BLoC/Cubit managing insights state
- **SupportCubit**: The BLoC/Cubit managing support request and connection state
- **ChatCubit**: The BLoC/Cubit managing real-time chat state
- **SecureStorage**: The flutter_secure_storage instance used to persist the auth token
- **GoogleSignInService**: The `google_sign_in` Flutter plugin used to obtain a Google OAuth `idToken`
- **Backend**: The Django/Channels REST API and WebSocket server
- **SupportRequest**: A pending request from one user to another to establish a support connection
- **SupportConnection**: An accepted, active peer-to-peer support relationship between two users
- **Insight**: An AI-generated, non-diagnostic emotional reflection linked to a journal entry
- **BottomNavBar**: The persistent bottom navigation bar present on all main screens

---

## Requirements

### Requirement 1: User Authentication

**User Story:** As a new or returning user, I want to register and log in securely, so that my data is private and only accessible to me.

#### Acceptance Criteria

1. WHEN a user submits a valid username and password on the login screen, THE App SHALL send a POST request to `/api/auth/login/` and store the returned token in SecureStorage.
2. WHEN a login request succeeds, THE App SHALL navigate the user to the HomeScreen.
3. IF a login request returns an error response, THEN THE App SHALL display a descriptive error message on the login screen without clearing the username field.
4. WHEN a user submits a valid username, password, and matching confirmation password on the signup screen, THE App SHALL send a POST request to `/api/auth/signup/` and store the returned token in SecureStorage.
5. IF the password and confirmation password fields do not match on the signup screen, THEN THE App SHALL display a validation error before making any network request.
6. WHEN the App launches and a valid token exists in SecureStorage, THE App SHALL navigate directly to the HomeScreen without showing the login screen.
7. WHEN a user logs out, THE App SHALL delete the token from SecureStorage and navigate to the login screen.
8. WHILE a user is authenticated, THE ApiService SHALL attach the stored token as a Bearer authorization header on every outgoing HTTP request.
9. IF the Backend returns a 401 Unauthorized response on any request, THEN THE App SHALL clear the token from SecureStorage and navigate the user to the login screen.
10. WHEN a user taps "Continue with Google" on the login screen, THE App SHALL invoke the `google_sign_in` plugin, obtain an `idToken`, and send it to the Backend via POST `/api/auth/google/`; upon a successful response THE App SHALL store the returned token in SecureStorage and navigate to the HomeScreen.
11. IF the Google Sign-In flow is cancelled by the user or returns an error, THEN THE App SHALL remain on the login screen and display a descriptive error message if an error occurred; no network request SHALL be made on cancellation.
12. THE login screen SHALL present three authentication options: email/password login, "Continue with Google", and a "Forgot Password" link.
13. WHEN a user taps "Forgot Password", THE App SHALL navigate to a password reset screen where the user can submit their email address to receive a reset link via POST `/api/auth/password/reset/`.

---

### Requirement 2: Bottom Navigation

**User Story:** As a user, I want to move between the five main sections of the app easily, so that I can access any feature without getting lost.

#### Acceptance Criteria

1. THE App SHALL display a persistent BottomNavBar with five tabs: Home, Journal, Insights, Support, and Chat.
2. WHEN a user taps a BottomNavBar tab, THE App SHALL navigate to the corresponding screen without resetting the state of previously visited screens.
3. WHILE a user is unauthenticated, THE App SHALL not display the BottomNavBar.

---

### Requirement 3: Home Dashboard

**User Story:** As a user, I want a dashboard that gives me an at-a-glance overview of my emotional wellness activity, so that I can quickly understand my current state and take action.

#### Acceptance Criteria

1. WHEN the HomeScreen loads, THE HomeCubit SHALL request dashboard summary data from the Backend via ApiService.
2. THE App SHALL display the count of pending incoming support requests on the HomeScreen.
3. THE App SHALL display the count of active support connections on the HomeScreen.
4. THE App SHALL display the count of journal entries on the HomeScreen.
5. THE App SHALL display the most recent journal entry preview on the HomeScreen.
6. THE App SHALL display the count of unread insights on the HomeScreen.
7. WHILE the HomeCubit is loading dashboard data, THE HomeScreen SHALL display a loading indicator.
8. IF the dashboard data request fails, THEN THE HomeScreen SHALL display an error state with a retry option.

---

### Requirement 4: Journal — Create Entry

**User Story:** As a user, I want to write private journal entries, so that I can reflect on my emotions in a safe, personal space.

#### Acceptance Criteria

1. WHEN a user navigates to the Journal screen, THE App SHALL display a text input area and a save button.
2. WHEN a user submits a non-empty journal entry, THE JournalCubit SHALL send a POST request to `/api/journal/` with the entry content.
3. IF a user attempts to submit an empty or whitespace-only journal entry, THEN THE App SHALL display a validation error and not send any network request.
4. WHEN a journal entry is successfully saved, THE App SHALL navigate to the journal list or dashboard.
5. IF the journal save request fails, THEN THE App SHALL display an error message and preserve the user's written content so it is not lost.

---

### Requirement 5: Journal — View and Delete Entries

**User Story:** As a user, I want to view and manage my past journal entries, so that I can reflect on my history and keep my journal tidy.

#### Acceptance Criteria

1. WHEN the journal list screen loads, THE JournalCubit SHALL fetch all non-deleted journal entries for the current user from the Backend.
2. THE App SHALL display journal entries in reverse chronological order.
3. WHEN a user requests to delete a journal entry, THE JournalCubit SHALL send a DELETE request to `/api/journal/{journal_id}/`.
4. WHEN a journal entry is successfully deleted, THE App SHALL remove it from the displayed list without requiring a full page reload.
5. WHILE journal entries are loading, THE App SHALL display a loading indicator.
6. IF no journal entries exist, THEN THE App SHALL display an empty state message encouraging the user to write their first entry.

---

### Requirement 6: Insights

**User Story:** As a user, I want to view AI-generated emotional reflections based on my journal entries, so that I can gain perspective on my emotional patterns.

#### Acceptance Criteria

1. WHEN the InsightsScreen loads, THE InsightsCubit SHALL fetch all non-dismissed insights for the current user from the Backend.
2. THE App SHALL display insights in a card-based layout in reverse chronological order.
3. Each insight card SHALL display the insight title and message text.
4. WHEN a user dismisses an insight, THE InsightsCubit SHALL send a POST request to `/api/insights/dismiss/{insight_id}/`.
5. WHEN an insight is successfully dismissed, THE App SHALL remove it from the displayed list without requiring a full page reload.
6. WHILE insights are loading, THE App SHALL display a loading indicator.
7. IF no insights exist, THEN THE App SHALL display an empty state message.
8. IF the insights fetch request fails, THEN THE App SHALL display an error state with a retry option.

---

### Requirement 7: Support — Send and Manage Requests

**User Story:** As a user, I want to send and respond to support requests, so that I can form anonymous peer support connections with others.

#### Acceptance Criteria

1. WHEN the SupportScreen loads, THE SupportCubit SHALL fetch the list of incoming pending support requests and active connections from the Backend.
2. THE App SHALL display a list of users available to send support requests to, excluding already-connected users and the current user.
3. WHEN a user sends a support request, THE SupportCubit SHALL send a POST request to `/api/support/send/{user_id}/`.
4. IF a support request to a user is already pending, THEN THE App SHALL not allow sending a duplicate request.
5. WHEN a user accepts an incoming support request, THE SupportCubit SHALL send a POST request to `/api/support/accept/{request_id}/`.
6. WHEN a user rejects an incoming support request, THE SupportCubit SHALL send a POST request to `/api/support/reject/{request_id}/`.
7. WHEN a support request is accepted, THE App SHALL update the active connections list to include the new connection.
8. WHILE support data is loading, THE App SHALL display a loading indicator.
9. IF a support action request fails, THEN THE App SHALL display an error message.

---

### Requirement 8: Chat — Real-Time Messaging

**User Story:** As a user, I want to send and receive messages in real time with my support connections, so that I can have meaningful, anonymous conversations.

#### Acceptance Criteria

1. WHEN a user opens a chat with an active support connection, THE ChatCubit SHALL establish a WebSocket connection to `ws://{host}/ws/chat/{connection_id}/` via WebSocketService.
2. WHEN the WebSocket connection is established, THE App SHALL load the existing message history for the connection from the Backend via ApiService.
3. WHEN a user sends a non-empty message, THE ChatCubit SHALL transmit the message as a JSON payload `{ "message": "<content>" }` over the WebSocket connection.
4. IF a user attempts to send an empty or whitespace-only message, THEN THE App SHALL not transmit any data.
5. WHEN a message is received over the WebSocket, THE App SHALL append it to the chat message list and scroll to the latest message.
6. THE App SHALL display each message with the message content, sender identity (self or other), and timestamp.
7. WHEN a user navigates away from the ChatScreen, THE WebSocketService SHALL close the WebSocket connection cleanly.
8. IF the WebSocket connection is lost unexpectedly, THEN THE WebSocketService SHALL attempt to reconnect and THE App SHALL display a reconnecting indicator.
9. WHILE the WebSocket connection is being established, THE App SHALL display a connecting indicator.

---

### Requirement 9: Typing Indicators

**User Story:** As a user, I want to see when the other person is typing, so that I know the conversation is active.

#### Acceptance Criteria

1. WHEN the local user begins typing in the chat input field, THE ChatCubit SHALL send a typing indicator event over the WebSocket.
2. WHEN a typing indicator event is received from the other user, THE App SHALL display a visible typing indicator in the chat view.
3. WHEN the other user stops typing for more than 10 seconds, THE App SHALL hide the typing indicator.

---

### Requirement 10: Security and Privacy

**User Story:** As a user, I want my data and identity to be protected, so that I can use the app with confidence.

#### Acceptance Criteria

1. THE SecureStorage SHALL be the only local storage mechanism used for the auth token; the token SHALL NOT be stored in shared preferences or plain files.
2. WHEN a WebSocket connection is attempted, THE WebSocketService SHALL only connect if a valid auth token is present in SecureStorage.
3. THE App SHALL not store journal content, insight text, or message content in any local persistent storage.
4. WHERE the Backend returns user aliases for support connections, THE App SHALL display the alias rather than the real username.

---

### Requirement 11: UI Design and Accessibility

**User Story:** As a user, I want a calm, minimal, and accessible interface, so that the app feels emotionally safe and easy to use.

#### Acceptance Criteria

1. THE App SHALL use a color palette of soft blue, sea green, white, and neutral backgrounds throughout all screens.
2. THE App SHALL use smooth screen transitions and avoid jarring animations.
3. THE App SHALL display card-based layouts for journal entries and insights.
4. WHILE any network request is in progress, THE App SHALL display a loading indicator appropriate to the context.
5. IF any network request fails, THEN THE App SHALL display a human-readable error message rather than a raw error code or stack trace.
6. THE App SHALL support standard Android accessibility features including sufficient color contrast and touch target sizes of at least 48x48 logical pixels.

---

### Requirement 12: State Management Architecture

**User Story:** As a developer, I want a consistent BLoC/Cubit architecture, so that the app is maintainable and each screen's state is isolated.

#### Acceptance Criteria

1. THE App SHALL use a dedicated Cubit for each of the five main screens: HomeCubit, JournalCubit, InsightsCubit, SupportCubit, and ChatCubit.
2. THE App SHALL use a single shared ApiService instance injected into all Cubits for HTTP communication.
3. THE App SHALL use a single shared WebSocketService instance injected into ChatCubit for WebSocket communication.
4. WHEN a Cubit emits a loading state, THE corresponding screen widget SHALL render a loading indicator.
5. WHEN a Cubit emits an error state, THE corresponding screen widget SHALL render an error message.
6. WHEN a Cubit emits a success state, THE corresponding screen widget SHALL render the data.
