# SoulCare Project Rules & Engineering Guidelines

Mandatory architectural rules, coding standards, and design system constraints for the **SoulCare** project.

---

## 🚫 Rule 1: Strict Backend Integrity (Zero Modification Directive)

1. **Production Backend Lock**: The Django REST Framework and WebSocket backend (`/backend`) is 100% complete and production-ready.
2. **Forbidden Actions**:
   - DO NOT alter any Django views, serializers, models, URL routes, or database schema.
   - DO NOT alter the VADER NLP sentiment engine, Big Five OCEAN scoring, or Cosine Similarity peer matching algorithms.
   - DO NOT alter WebSocket consumers (`AsyncWebsocketConsumer`) or authentication middleware.
3. **Frontend Integration Only**: All frontend features MUST consume the existing REST & WebSocket APIs without altering backend contracts.

---

## 🎨 Rule 2: Design System & Aesthetics (Material Design 3)

1. **Design Goal**: Create a calm, premium, startup-grade emotional wellness experience. Never create generic templates.
2. **Color Palette Tokens**:
   - **Primary Lavender**: `#7C6EF6`
   - **Secondary Mint Green**: `#8DD8C8`
   - **Accent Soft Yellow**: `#FFD166`
   - **Background**: `#F8FAFC`
   - **Cards**: Pure white with soft elevation (`0.06` opacity shadow) and 24px - 32px rounded corners.
3. **Typography**:
   - **Headings**: `Poppins Bold` / `PlusJakartaSans`
   - **Body Text**: `Inter Regular`
   - **Buttons**: SemiBold, 56dp height on primary action buttons.
4. **Micro-Animations**:
   - All interactive elements must feel responsive and alive via hover/press ripples, input focus border glows, screen slide/fade transitions, and error shake feedback.

---

## 🏗️ Rule 3: Flutter Clean Architecture & State Management

1. **Layer Separation**:
   - `core/`: Network endpoints, theme system, failure definitions, secure storage.
   - `data/`: Data sources (HTTP/WebSocket clients) and repository implementations.
   - `domain/`: Abstract repositories and domain models.
   - `presentation/`: Controllers (`ChangeNotifier` / `Cubit`) and UI Widgets/Screens.
2. **No Business Logic in Widgets**:
   - Widgets MUST only handle layout, animation controllers, rendering, and event delegation to Controllers.
   - API calls, validation logic, and state mutations belong strictly in Controllers and Repositories.
3. **State Management**:
   - Use `ChangeNotifier` / `AnimatedBuilder` for state updates.
   - Ensure proper disposal of Controllers, FocusNodes, and TextEditingControllers to prevent memory leaks.

---

## 🔒 Rule 4: Security & Authentication Protocols

1. **JWT Storage**:
   - Access and Refresh tokens MUST be stored securely using `SecureStorageService` (`flutter_secure_storage`).
   - NEVER store passwords or raw JWTs in plaintext or local preferences (`SharedPreferences`).
2. **Token Rotation & Authorization**:
   - Include `Authorization: Bearer <access_token>` header on all protected REST requests.
   - Pass JWT token via query parameter (`?token=<jwt>`) on WebSocket handshakes.
3. **Google OAuth Flow**:
   - Validate Google ID Token via the Django backend `/api/auth/google/` endpoint. The backend remains the single source of truth for user creation and token issuance.

---

## ♿ Rule 5: User Experience & Accessibility Standards

1. **Keyboard & Soft Input**:
   - Form screens MUST never obscure input fields when the software keyboard opens (wrap in `SingleChildScrollView` / `LayoutBuilder`).
   - Use proper `TextInputAction` (`TextInputAction.next` -> `TextInputAction.done`) and autofill hints (`AutofillGroup`, `AutofillHints.email`, `AutofillHints.password`).
2. **Graceful Loading & Error States**:
   - Use `SkeletonLoader` widgets during initial API fetches instead of bare progress spinners.
   - Use non-intrusive inline validation and floating error snackbars with haptic feedback. Never display raw exception traces or ugly system alerts to the user.

---

## 🌿 Rule 6: Git & Deployment Workflow

1. **Branch Management**: Work on `main` or feature branches.
2. **Commit Hygiene**: Write descriptive, structured commit messages detailing the component or layer modified.
3. **Push Control**:
   - NEVER push unverified code to GitHub.
   - Always verify local server stability (`python backend/manage.py runserver 8000`) before committing.
   - Honor explicit user directives regarding git push execution.
