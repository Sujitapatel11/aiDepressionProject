# Implementation Plan: MindSpace Flutter App

## Overview

Incremental implementation of the MindSpace Flutter client, starting from project setup and dependency installation through to full feature integration. Each task builds on the previous, ending with all screens wired together via BLoC/Cubit, ApiService, and WebSocketService.

## Tasks

- [x] 1. Project setup and dependency installation
  - Add Flutter dependencies to `pubspec.yaml`: `flutter_bloc`, `dio`, `web_socket_channel`, `flutter_secure_storage`, `google_sign_in`, `equatable`
  - Add Django backend dependency: `django-allauth` to `backend/requirements.txt` and install it (`pip install django-allauth`)
  - Configure `django-allauth` in `backend/config/settings.py`: add to `INSTALLED_APPS`, configure `AUTHENTICATION_BACKENDS`, add `SOCIALACCOUNT_PROVIDERS` for Google
  - Run `flutter pub get` to resolve Flutter packages
  - _Requirements: 1.1, 1.10, 10.1_


- [x] 2. Flutter project structure and core interfaces
  - Create folder structure: `lib/models/`, `lib/services/`, `lib/cubits/`, `lib/screens/`, `lib/widgets/`, `lib/theme/`
  - Define Dart model classes: `User`, `JournalEntry`, `Insight`, `SupportRequest`, `SupportConnection`, `ChatMessage`
  - Define `AuthState`, `HomeState`, `JournalState`, `InsightsState`, `SupportState`, `ChatState` sealed classes using `equatable`
  - _Requirements: 12.1, 12.4, 12.5, 12.6_

- [x] 3. App theme and global styling
  - Create `lib/theme/app_theme.dart` with `ThemeData` using soft blue, sea green, white, and neutral background palette
  - Define reusable text styles, card decoration, and button themes
  - Set minimum touch target sizes to 48×48 logical pixels via `MaterialTapTargetSize.padded`
  - _Requirements: 11.1, 11.2, 11.3, 11.6_

- [x] 4. SecureStorage and ApiService
  - Implement `lib/services/secure_storage_service.dart` wrapping `flutter_secure_storage` with `readToken`, `writeToken`, `deleteToken` methods
  - Implement `lib/services/api_service.dart` using `Dio` with a base URL interceptor that attaches `Authorization: Bearer <token>` on every request
  - Add a Dio interceptor that catches 401 responses, clears the token, and emits an unauthenticated signal
  - _Requirements: 1.8, 1.9, 10.1, 10.3_

  - [ ]* 4.1 Write property test for Bearer token attachment (Property 5)
    - **Property 5: Every authenticated request carries Bearer token**
    - **Validates: Requirements 1.8**

  - [ ]* 4.2 Write property test for 401 clears token (Property 6)
    - **Property 6: 401 response clears token**
    - **Validates: Requirements 1.9**


- [ ] 5. AuthCubit and authentication screens
  - [x] 5.1 Implement `AuthCubit` in `lib/cubits/auth_cubit.dart`
    - Methods: `login(username, password)`, `signup(username, password, confirm)`, `loginWithGoogle()`, `logout()`, `checkAuthStatus()`
    - On launch, read token from SecureStorage; emit authenticated or unauthenticated state
    - _Requirements: 1.1, 1.2, 1.4, 1.6, 1.7_

  - [ ]* 5.2 Write property test for authentication round-trip (Property 1)
    - **Property 1: Authentication round-trip stores token**
    - **Validates: Requirements 1.1, 1.4**

  - [ ]* 5.3 Write property test for invalid credentials error state (Property 2)
    - **Property 2: Invalid credentials produce non-empty error state**
    - **Validates: Requirements 1.3, 11.5**

  - [ ]* 5.4 Write property test for mismatched passwords (Property 3)
    - **Property 3: Mismatched passwords are rejected before network**
    - **Validates: Requirements 1.5**

  - [ ]* 5.5 Write property test for logout clears token (Property 4)
    - **Property 4: Logout clears token**
    - **Validates: Requirements 1.7**

  - [x] 5.6 Implement `LoginScreen` in `lib/screens/auth/login_screen.dart`
    - Email/password form, "Continue with Google" button, "Forgot Password" link
    - Wire to `AuthCubit`; show loading indicator during request; show error message on failure without clearing username
    - _Requirements: 1.1, 1.3, 1.12_

  - [ ]* 5.7 Write property test for login screen presents all three options (Property 25)
    - **Property 25: Login screen presents all three authentication options**
    - **Validates: Requirements 1.12**

  - [x] 5.8 Implement Google Sign-In in `AuthCubit.loginWithGoogle()`
    - Call `google_sign_in.signIn()`, extract `idToken`, POST to `/api/auth/google/`, store returned token
    - On cancellation (null result): stay on login screen, no network call
    - On error: emit error state with human-readable message
    - _Requirements: 1.10, 1.11_

  - [ ]* 5.9 Write property test for Google token forwarded to backend (Property 22)
    - **Property 22: Google Sign-In token is forwarded to backend**
    - **Validates: Requirements 1.10**

  - [ ]* 5.10 Write property test for Google cancellation produces no state change (Property 23)
    - **Property 23: Google Sign-In cancellation produces no state change**
    - **Validates: Requirements 1.11**

  - [ ]* 5.11 Write property test for Google failure produces error state (Property 24)
    - **Property 24: Google Sign-In failure produces non-empty error state**
    - **Validates: Requirements 1.11**

  - [x] 5.12 Implement `SignupScreen` in `lib/screens/auth/signup_screen.dart`
    - Username, password, confirm password fields; client-side mismatch validation before any network call
    - _Requirements: 1.4, 1.5_

  - [x] 5.13 Implement `ForgotPasswordScreen` in `lib/screens/auth/forgot_password_screen.dart`
    - Email input; POST to `/api/auth/password/reset/`; show confirmation message on success
    - _Requirements: 1.13_


- [x] 6. Bottom navigation shell
  - Implement `lib/screens/shell/main_shell.dart` with `BottomNavigationBar` containing five tabs: Home, Journal, Insights, Support, Chat
  - Use `IndexedStack` to preserve screen state across tab switches
  - Show shell only when `AuthCubit` is in authenticated state; redirect to `LoginScreen` otherwise
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 7. Checkpoint — auth and navigation
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. HomeCubit and HomeScreen
  - [x] 8.1 Implement `HomeCubit` in `lib/cubits/home_cubit.dart`
    - `loadDashboard()` fetches summary data from Backend via ApiService
    - Emits loading, success (with counts and preview), and error states
    - _Requirements: 3.1, 3.7, 3.8_

  - [ ]* 8.2 Write property test for dashboard renders all summary fields (Property 7)
    - **Property 7: Dashboard renders all summary fields**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

  - [x] 8.3 Implement `HomeScreen` in `lib/screens/home/home_screen.dart`
    - Display pending support request count, active connection count, journal entry count, latest journal preview, unread insight count
    - Show loading indicator while loading; show error state with retry button on failure
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_


- [ ] 9. JournalCubit and Journal screens
  - [x] 9.1 Implement `JournalCubit` in `lib/cubits/journal_cubit.dart`
    - `loadEntries()`: GET `/api/journal/`; emit entries sorted newest-first
    - `saveEntry(content)`: validate non-empty/non-whitespace; POST `/api/journal/`; on failure retain content in error state
    - `deleteEntry(id)`: DELETE `/api/journal/{id}/`; remove from list state on success
    - _Requirements: 4.2, 4.3, 4.5, 5.1, 5.3, 5.4_

  - [ ]* 9.2 Write property test for whitespace-only input rejected (Property 8)
    - **Property 8: Whitespace-only input is rejected without network call**
    - **Validates: Requirements 4.3, 8.4**

  - [ ]* 9.3 Write property test for content preserved on save failure (Property 9)
    - **Property 9: Content is preserved on save failure**
    - **Validates: Requirements 4.5**

  - [ ]* 9.4 Write property test for reverse chronological order (Property 10)
    - **Property 10: Lists are displayed in reverse chronological order**
    - **Validates: Requirements 5.2, 6.2**

  - [ ]* 9.5 Write property test for deleted item removed from list state (Property 11)
    - **Property 11: Deleted item is removed from list state**
    - **Validates: Requirements 5.4, 6.5**

  - [x] 9.6 Implement `JournalCreateScreen` in `lib/screens/journal/journal_create_screen.dart`
    - Text area and save button; show validation error on empty/whitespace; preserve content on failure
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

  - [x] 9.7 Implement `JournalListScreen` in `lib/screens/journal/journal_list_screen.dart`
    - Card-based list in reverse chronological order; delete action per entry; loading indicator; empty state message
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_


- [ ] 10. InsightsCubit and InsightsScreen
  - [x] 10.1 Implement `InsightsCubit` in `lib/cubits/insights_cubit.dart`
    - `loadInsights()`: GET `/api/insights/`; emit sorted newest-first
    - `dismissInsight(id)`: POST `/api/insights/dismiss/{id}/`; remove from list state on success
    - _Requirements: 6.1, 6.4, 6.5_

  - [ ]* 10.2 Write property test for insight card renders title and message (Property 12)
    - **Property 12: Insight card renders title and message**
    - **Validates: Requirements 6.3**

  - [x] 10.3 Implement `InsightsScreen` in `lib/screens/insights/insights_screen.dart`
    - Card layout showing title and message; dismiss action; loading indicator; empty state; error state with retry
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

- [ ] 11. SupportCubit and SupportScreen
  - [x] 11.1 Implement `SupportCubit` in `lib/cubits/support_cubit.dart`
    - `loadSupport()`: fetch pending requests and active connections
    - `sendRequest(userId)`: POST `/api/support/send/{userId}/`; guard against duplicate pending requests
    - `acceptRequest(requestId)`: POST `/api/support/accept/{requestId}/`; add connection to list
    - `rejectRequest(requestId)`: POST `/api/support/reject/{requestId}/`
    - _Requirements: 7.1, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 11.2 Write property test for available users excludes self and connected (Property 13)
    - **Property 13: Available users list excludes self and connected users**
    - **Validates: Requirements 7.2**

  - [ ]* 11.3 Write property test for accepting request grows connections list (Property 14)
    - **Property 14: Accepting a request grows the connections list**
    - **Validates: Requirements 7.7**

  - [x] 11.4 Implement `SupportScreen` in `lib/screens/support/support_screen.dart`
    - List available users (excluding self and connected); incoming requests with accept/reject; active connections list; loading and error states
    - Display alias instead of real username where provided
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.8, 7.9, 10.4_

  - [ ]* 11.5 Write property test for alias displayed instead of real username (Property 19)
    - **Property 19: Alias is displayed instead of real username**
    - **Validates: Requirements 10.4**


- [x] 12. Checkpoint — core screens
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. WebSocketService
  - Implement `lib/services/websocket_service.dart` using `web_socket_channel`
  - `connect(connectionId, token)`: refuse to connect if no valid token in SecureStorage; open `ws://{host}/ws/chat/{connectionId}/`
  - `disconnect()`: close channel cleanly
  - `sendMessage(payload)`: send JSON string over channel
  - Expose a `Stream<dynamic>` of incoming messages
  - Auto-reconnect on unexpected disconnect; expose reconnecting state
  - _Requirements: 8.1, 8.7, 8.8, 8.9, 10.2_

  - [ ]* 13.1 Write property test for WebSocket requires valid token (Property 18)
    - **Property 18: WebSocket requires valid token**
    - **Validates: Requirements 10.2**

- [ ] 14. ChatCubit and ChatScreen
  - [x] 14.1 Implement `ChatCubit` in `lib/cubits/chat_cubit.dart`
    - `openChat(connectionId)`: connect WebSocket, load message history via ApiService
    - `sendMessage(content)`: validate non-empty/non-whitespace; transmit `{ "message": content }` over WebSocket
    - On incoming WebSocket message: append to message list, scroll to bottom
    - On WebSocket disconnect: emit reconnecting state
    - `closeChat()`: disconnect WebSocket cleanly
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.7, 8.8_

  - [ ]* 14.2 Write property test for chat message serialization round-trip (Property 15)
    - **Property 15: Chat message serialization round-trip**
    - **Validates: Requirements 8.3**

  - [ ]* 14.3 Write property test for received message appends to chat list (Property 16)
    - **Property 16: Received message appends to chat list**
    - **Validates: Requirements 8.5**

  - [x] 14.4 Implement `ChatScreen` in `lib/screens/chat/chat_screen.dart`
    - Message list with self/other identity and timestamp; text input with send button; connecting indicator; reconnecting indicator
    - Scroll to latest message on new message received
    - _Requirements: 8.5, 8.6, 8.9_

  - [ ]* 14.5 Write property test for message widget renders content, sender, timestamp (Property 17)
    - **Property 17: Message widget renders content, sender identity, and timestamp**
    - **Validates: Requirements 8.6**


- [x] 15. Typing indicators
  - In `ChatCubit`, send a typing indicator event over WebSocket when the user starts typing in the chat input
  - On receiving a typing indicator event from the peer, show a visible typing indicator in `ChatScreen`
  - Hide the typing indicator after 10 seconds of no typing events from the peer
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 16. Security and privacy hardening
  - Audit all Cubits and services to confirm no journal content, insight text, or message content is written to local persistent storage
  - Confirm `SecureStorage` is the sole token storage mechanism (no `SharedPreferences` usage)
  - _Requirements: 10.1, 10.3_

- [x] 17. Error handling and accessibility polish
  - Audit all Cubit error states to ensure messages are human-readable strings (no raw status codes, exception class names, or stack traces)
  - Verify all interactive widgets have a minimum touch target of 48×48 logical pixels
  - _Requirements: 11.5, 11.6_

  - [ ]* 17.1 Write property test for all error messages are human-readable (Property 20)
    - **Property 20: All error messages are human-readable strings**
    - **Validates: Requirements 11.5**

  - [ ]* 17.2 Write property test for interactive widgets meet minimum touch target (Property 21)
    - **Property 21: Interactive widgets meet minimum touch target size**
    - **Validates: Requirements 11.6**

- [x] 18. Wire everything together in `main.dart`
  - Set up `MultiRepositoryProvider` with `SecureStorageService`, `ApiService`, `WebSocketService`
  - Set up `MultiBlocProvider` with `AuthCubit`, `HomeCubit`, `JournalCubit`, `InsightsCubit`, `SupportCubit`, `ChatCubit`
  - Configure `MaterialApp` router: unauthenticated → `LoginScreen`; authenticated → `MainShell`
  - Apply `AppTheme` globally
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 19. Final checkpoint — full integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at key milestones
