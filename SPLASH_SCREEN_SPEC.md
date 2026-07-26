# SoulCare — Splash Screen Feature Specification

Production Product Specification for the **SoulCare Splash Screen**.

---

## 🌟 1. Screen Purpose
The Splash Screen serves as the initial mindful entry point of the SoulCare application. It initializes core application dependencies, checks local secure storage for existing JWT tokens, verifies server availability, and smoothly navigates the user to their target destination without abrupt layout shifts.

---

## 🎯 2. UX Goal
Provide a soothing, peaceful 2.2-second arrival experience that immediately signals safety, emotional warmth, and professional quality while background initialization tasks complete silently.

---

## 🧘 3. Target User Emotion
- **Calm & Grounded**: The breathing visual rhythm settles pre-app anxiety.
- **Reassured & Safe**: Subtle ambient lighting and smooth motion establish high trust.

---

## 📐 4. Layout Specification

### Canvas & Safe Area
- Full-screen canvas with edge-to-edge transparent status and navigation bar.

### Vertical Hierarchy
- **Top 25%**: Floating ambient sun ☀️ accent & gentle background gradient glow.
- **Center 50%**:
  - `PeacefulPersonIllustration`: Vector illustration of a person sitting peacefully in lotus meditation pose surrounded by floating botanical leaves 🍃 and subtle particle aura.
  - SoulCare Brand Logo: Clean lotus motif + typography (`displayLarge` scale).
  - Tagline: *"Your sanctuary for emotional growth"*.
- **Bottom 25%**: Minimal progress indicator / subtle branding baseline.

---

## 🎨 5. Color Usage & Design Tokens

- **Background**: `AppColors.appBackground` (`#F8FAFC` Light / `#0F172A` Dark).
- **Primary Brand Accent**: `AppColors.lavenderPrimary` (`#7C6EF6`).
- **Secondary Ambient Accent**: `AppColors.mintSecondary` (`#8DD8C8`).
- **Warm Glow**: `AppColors.softYellowAccent` (`#FFD166`).
- **Typography**: `AppColors.deepSlateText` (`#1E293B` Light / `#FFFFFF` Dark).

---

## 🔤 6. Typography
- **Brand Title**: `displayLarge` (32sp / Bold / Plus Jakarta Sans / Letter-spacing: -0.8px).
- **Tagline**: `bodyMedium` (14sp / Medium / Inter / Color: `AppColors.mutedText`).

---

## ⏱️ 7. Animation Timeline & Sequence

Total Duration: **2200ms**

```
 0ms ────────────── 400ms ────────────── 1200ms ────────────── 1800ms ────── 2200ms
  │                   │                    │                     │            │
  ▼                   ▼                    ▼                     ▼            ▼
Background        Logo & Text          Illustration          Token Check  Navigate to
Fade-In           Fade & Scale-Up      Breathing Pulse       Complete     Target Screen
(0.0 -> 1.0)      (0.95 -> 1.0)        (0.96 <-> 1.04)
```

1. **0ms – 400ms**: Background radial gradient glow fades in smoothly (`Curves.easeOut`).
2. **300ms – 900ms**: Brand logo and title slide up + fade in (`Curves.easeOutCubic`).
3. **500ms – 2200ms**: `PeacefulPersonIllustration` breathes continuously with a gentle 3.2-second sine wave scale loop (`0.96` to `1.04`).
4. **1800ms – 2200ms**: Screen content scales slightly (`1.0` -> `1.03`) and fades out (`opacity` 1.0 -> 0.0) as navigation transition triggers.

---

## 🧭 8. Authentication & Navigation Logic

While animations play, `AuthNotifier` queries `SecureStorageService`:

```
                  ┌─────────────────────────────────┐
                  │ Query Secure Storage for Tokens  │
                  └────────────────┬────────────────┘
                                   │
                 ┌─────────────────┴─────────────────┐
                 ▼                                   ▼
        [ Tokens Present? ]                 [ Tokens Missing? ]
                 │                                   │
      ┌──────────┴──────────┐                     ┌──┴────────────────┐
      ▼                     ▼                     ▼                   ▼
[ Valid Access Token ] [ Expired Token ]   [ First Time Launch ] [ Returning User ]
      │                     │                     │                   │
      ▼                     ▼                     ▼                   ▼
Navigate to            Attempt Silent       Navigate to         Navigate to
Dashboard Shell        Refresh API Call     Onboarding          Login Screen
                       │            │
             Success ──┴            └── Failure
                │                            │
                ▼                            ▼
          Dashboard Shell               Login Screen
```

---

## ♿ 9. Accessibility Considerations

- **Semantics**: Screen content labeled as *"SoulCare Application Loading"*.
- **Reduced Motion**: If user device settings have `Disable Animations` enabled, skip breathing motion loops and render static illustration directly.

---

## 🌗 10. Dark Mode & Responsive Scaling

- **Dark Mode**: Background switches to `#0F172A`; ambient aura glows adjust to `#7C6EF6` at `0.18` opacity.
- **Responsive**: Illustration size scales dynamically (`size = clamp(120, screenWidth * 0.35, 180)`).

---

## 📋 11. Acceptance Criteria

- [ ] Splash screen launches immediately upon app startup without white flash.
- [ ] Breathing vector illustration renders smoothly at 60fps.
- [ ] Token check completes within the 2.2-second animation window.
- [ ] Authenticated users transition directly to Dashboard Shell.
- [ ] Unauthenticated users transition directly to Login Screen.
