# SoulCare — Onboarding Experience Feature Specification

Production Product Specification for the **SoulCare Onboarding Flow** (3-Screen Experience).

---

## 🧘 1. Overview & Emotional Strategy
The Onboarding flow introduces first-time users to SoulCare in under 30 seconds. Rather than dumping technical features, it builds emotional trust, calms pre-app anxiety, and articulates SoulCare's three core pillars: **Mindful Reflection**, **AI Insights**, and **Safe Peer Connection**.

---

## 📱 2. Three-Screen Onboarding Specifications

### Screen 1: "Mindful Reflection" (Self-Discovery)
1. **Purpose**: Introduce the reflective journaling sanctuary.
2. **User Emotion**: Relieved, understood, calm.
3. **Headline**: *"A safe space for your inner thoughts."*
4. **Supporting Text**: *"Express your daily feelings freely in a private, judgment-free sanctuary designed for your emotional growth."*
5. **Illustration Concept**: A person sitting peacefully under a warm glowing sun ☀️ with floating botanical leaves 🍃 and soft pastel aura.
6. **Background Treatment**: Warm lavender radial gradient backdrop (`#7C6EF6` at `0.10` opacity).
7. **CTA Button**: *"Continue →"* (Primary gradient 56dp height button).
8. **Skip Behaviour**: Top-right minimal button *"Skip"* -> jumps immediately to Screen 3 / Login.
9. **Progress Indicator**: 3-segment pill indicator (Segment 1 active: `#7C6EF6`, width 28dp; Segments 2-3 inactive: `#E2E8F0`, width 8dp).
10. **Accessibility**: Screen reader semantics: *"Onboarding Page 1 of 3: Mindful Reflection"*.
11. **Animation Behaviour**: Smooth 350ms parallax slide entry (`Curves.easeOutCubic`) with gentle breathing illustration loop.

---

### Screen 2: "AI-Powered Insights" (Self-Awareness)
1. **Purpose**: Explain how automated sentiment analysis reveals emotional patterns.
2. **User Emotion**: Curious, hopeful, empowered.
3. **Headline**: *"Understand your emotional patterns."*
4. **Supporting Text**: *"Receive gentle AI insights and actionable coping strategies tailored to your unique mood triggers."*
5. **Illustration Concept**: An abstract glowing mood spectrum lens emitting soft mint `#8DD8C8` and yellow `#FFD166` sparkles.
6. **Background Treatment**: Soft mint radial gradient backdrop (`#8DD8C8` at `0.12` opacity).
7. **CTA Button**: *"Next →"* (Primary gradient 56dp height button).
8. **Skip Behaviour**: Top-right minimal button *"Skip"* -> jumps to Screen 3 / Login.
9. **Progress Indicator**: Segment 2 active (`#7C6EF6`, 28dp width).
10. **Accessibility**: Screen reader semantics: *"Onboarding Page 2 of 3: AI-Powered Insights"*.
11. **Animation Behaviour**: Card elevation float up + text slide (`Curves.easeOutCubic`).

---

### Screen 3: "Safe Peer Connection" (Human Connection)
1. **Purpose**: Introduce psychologically matched, anonymized peer support.
2. **User Emotion**: Connected, safe, reassured.
3. **Headline**: *"You are never alone on this journey."*
4. **Supporting Text**: *"Connect anonymously with empathetic peers matched by psychological compatibility in a secure, moderated space."*
5. **Illustration Concept**: Two stylized silhouettes sitting comfortably together under a protective glowing canopy.
6. **Background Treatment**: Warm combined lavender & yellow gradient background (`#FFD166` & `#7C6EF6`).
7. **CTA Button**: *"Get Started →"* (Primary gradient 56dp height button).
8. **Skip Behaviour**: Hidden on Screen 3.
9. **Progress Indicator**: Segment 3 active (`#7C6EF6`, 28dp width).
10. **Accessibility**: Screen reader semantics: *"Onboarding Page 3 of 3: Safe Peer Connection"*.
11. **Animation Behaviour**: Scale-up entry with celebratory particle shimmer (`Curves.bounceOut`).

---

## 🔄 3. Flow, Gestures & Persistence Mechanics

### Gesture & Swipe Behaviour
- Horizontal `PageView` swipe gestures with spring physics (`ClampingScrollPhysics`).
- Swiping left/right updates active page index and smoothly interpolates page indicator pill width (8dp -> 28dp).

### Button Interaction Logic
- **"Continue / Next"**: Smoothly animates `PageViewController` to `index + 1` over 350ms (`Curves.easeInOut`).
- **"Get Started"**: Sets persistent first-launch flag and navigates to `LoginScreen` via fade route transition.
- **"Skip"**: Jumps directly to `LoginScreen`.

### Persistent Onboarding Flag
- Storage Key: `KEY_HAS_COMPLETED_ONBOARDING` stored in `SecureStorageService`.
- Logic: When user taps *"Get Started"* or *"Skip"*, `KEY_HAS_COMPLETED_ONBOARDING` is set to `true`. Subsequent app launches bypass Onboarding and route directly from Splash to Login/Dashboard.

---

## 🎨 4. Design System Compliance

- **Colors**: Primary Lavender (`#7C6EF6`), Mint (`#8DD8C8`), Soft Yellow (`#FFD166`), Canvas (`#F8FAFC` Light / `#0F172A` Dark).
- **Typography**: Plus Jakarta Sans (`displayLarge` 28sp - 32sp) & Inter (`bodyLarge` 16sp).
- **Button Radius**: 20dp (`AppRadius.r20`).

---

## 📋 5. Acceptance Criteria

- [ ] Onboarding flow presents exactly 3 screens with smooth horizontal swipe gestures.
- [ ] Tapping "Skip" or "Get Started" sets `KEY_HAS_COMPLETED_ONBOARDING = true` in secure storage.
- [ ] Subsequent app launches skip onboarding and proceed directly to Login/Dashboard.
- [ ] Page indicators dynamically animate active pill expansion.
- [ ] Dark mode smoothly adapts background hues to deep night slate (`#0F172A`).
