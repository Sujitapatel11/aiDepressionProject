# SoulCare — Onboarding Implementation Plan Blueprint

Technical Implementation Plan Blueprint for the **SoulCare Onboarding Module** (`lib/features/authentication/presentation/screens/onboarding_screen.dart`).

---

## 📐 1. Screen Breakdown & Page Architecture

The Onboarding experience is rendered as a single `ConsumerStatefulWidget` containing a horizontal `PageView.builder` rendering 3 distinct page models:

1. **Page 1 (Index 0)**: *Mindful Reflection* — Lotus meditation vector artwork, warm lavender radial backdrop.
2. **Page 2 (Index 1)**: *AI-Powered Insights* — Glowing mood spectrum lens vector artwork, soft mint backdrop.
3. **Page 3 (Index 2)**: *Safe Peer Connection* — Supportive silhouette canopy vector artwork, warm lavender & yellow backdrop.

---

## 🧱 2. Widget Hierarchy & Component Tree

```
SoulCareOnboardingScreen (ConsumerStatefulWidget)
└── Scaffold
    └── Stack
        ├── BackgroundRadialGlow (AnimatedBuilder - interpolates color by page index)
        ├── SafeArea
        │   └── Column
        │       ├── OnboardingTopBar (Row)
        │       │   ├── SoulCareSmallLogo
        │       │   └── SkipButton (TextButton - hidden on page 3)
        │       ├── Expanded
        │       │   └── PageView.builder (horizontal PageController)
        │       │       └── OnboardingPageItem (StatelessWidget)
        │       │           ├── HeroIllustrationWidget (Breathing loop animation)
        │       │           ├── SizedBox(height: 24)
        │       │           ├── OnboardingHeadlineText ("Plus Jakarta Sans" 30sp)
        │       │           ├── SizedBox(height: 12)
        │       │           └── OnboardingBodyText ("Inter" 15sp)
        │       └── OnboardingBottomBar (Column)
        │           ├── PagePillIndicator (Row of 3 AnimatedContainer pills)
        │           ├── SizedBox(height: 24)
        │           └── PrimaryGradientButton ("Continue →" / "Next →" / "Get Started →")
```

---

## 🧩 3. Shared Reusable Components Identified

1. **`PrimaryGradientButton`** (`lib/shared/widgets/primary_gradient_button.dart`): Reusable 56dp height button with gradient fill (`#7C6EF6` -> `#6366F1`), 20dp radius, loading state, and forward arrow icon. Used across Onboarding, Login, Signup, and Reflection creation.
2. **`PagePillIndicator`** (`lib/shared/widgets/page_pill_indicator.dart`): Reusable horizontal page indicator animating active pill width (8dp -> 28dp).
3. **`BackgroundRadialGlow`** (`lib/shared/widgets/background_radial_glow.dart`): Ambient gradient glow painter adapting to screen theme.

---

## ⚡ 4. State Management (Riverpod Architecture)

- **Provider**: `onboardingStateProvider` (`StateNotifierProvider<OnboardingNotifier, OnboardingState>`)
- **State Model (`OnboardingState`)**:
  - `currentPageIndex` (int: 0, 1, 2)
  - `isLastPage` (bool)
  - `isCompleting` (bool - true during secure storage write)
- **Notifier Methods**:
  - `onPageChanged(int index)`: Updates `currentPageIndex` and `isLastPage`.
  - `completeOnboarding()`: Calls `SecureStorageService.write(KEY_HAS_COMPLETED_ONBOARDING, 'true')` and triggers navigation to `LoginScreen`.

---

## 🧭 5. Navigation & Local Persistence Flow

```
[ Tap "Get Started" / "Skip" ] ──► [ OnboardingNotifier.completeOnboarding() ]
                                                  │
                                                  ▼
                                 [ SecureStorageService.write() ]
                                 [ KEY_HAS_COMPLETED_ONBOARDING = 'true' ]
                                                  │
                                                  ▼
                                 [ context.go('/login') / Navigator.push ]
```

---

## ⏱️ 6. Animation Plan

1. **PageView Spring Transition**: `PageController.animateToPage(index, duration: 350ms, curve: Curves.easeInOutCubic)`.
2. **Indicator Pill Interpolation**: `AnimatedContainer` with `Duration(milliseconds: 250)` animating width (8dp inactive -> 28dp active) and color (`#E2E8F0` -> `#7C6EF6`).
3. **Breathing Vector Artwork**: `AnimationController` with 3.2-second repeating sine wave (`Curves.easeInOutSine`) scaling vector artwork between `0.96` and `1.04`.

---

## ♿ 7. Accessibility & Responsive Design

- **Touch Targets**: Minimum 48x48dp tap area on *"Skip"* and *"Get Started"* buttons.
- **Screen Reader Semantics**: `Semantics` wrappers on page items announcing page index and headline.
- **Responsive Layout**: Wrapped in `LayoutBuilder` & `SingleChildScrollView` to prevent soft-keyboard or small-screen pixel overflows.

---

## 🧪 8. Testing Checklist

- [ ] PageView swipes smoothly across all 3 onboarding pages.
- [ ] Tapping *"Continue"* on Page 1 advances to Page 2.
- [ ] Tapping *"Next"* on Page 2 advances to Page 3.
- [ ] Page 3 displays *"Get Started →"* button and hides *"Skip"* button.
- [ ] Tapping *"Skip"* or *"Get Started"* writes `KEY_HAS_COMPLETED_ONBOARDING = true` to secure storage and routes to LoginScreen.
- [ ] Re-launching app from Splash screen skips onboarding.
- [ ] Dark mode adapts canvas background to `#0F172A`.

---

## ✅ 9. Acceptance Criteria

- [ ] Zero business logic inside UI widgets (managed via `OnboardingNotifier`).
- [ ] 100% compliant with `DESIGN_SYSTEM.md` color tokens and 8pt grid spacing.
- [ ] Verified clean build with zero static analysis warnings (`flutter analyze`).
