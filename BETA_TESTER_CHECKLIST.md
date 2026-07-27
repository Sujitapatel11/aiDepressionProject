# SoulCare Closed Beta Tester Checklist & Instruction Guide

Welcome to the **SoulCare** Closed Beta testing team! This checklist will guide you through testing every major feature domain in the SoulCare mobile & web application.

As a beta tester, your real usage and in-app feedback directly shape the stability and quality of the SoulCare platform prior to public release.

---

## Pre-Requisites & Initial Setup

- [ ] **Download / Access Staging App Build**: Ensure you have installed the official SoulCare Closed Beta build (v1.0.0+beta).
- [ ] **Network Connectivity**: Confirm your app connects to the production staging backend (`https://staging-api.soulcare.app`).

---

## Functional Verification Checklist

### 1. Account Signup & Authentication
- [ ] **New User Registration**: Create a new account using your email address and a strong password.
- [ ] **Login & Session Refresh**: Log out and log back in using your credentials.
- [ ] **Password Reset (Optional)**: Test requesting a password reset email from the login screen.

### 2. Journal Entry Creation & Management
- [ ] **Create New Journal Entry**: Tap the "+" icon to write a journal entry detailing your current thoughts or reflections.
- [ ] **Mood Score Rating**: Rate your current mood score (1–10) and anxiety level.
- [ ] **Journal History & Detail View**: Browse your previous journal entries and tap an entry to view its detailed view.

### 3. Mood Check-In & Well-Being Analytics
- [ ] **Daily Mood Check-In**: Complete a quick daily mood check-in.
- [ ] **Analytics Dashboard**: Open the main dashboard to view your mood trends, weekly averages, and well-being trajectory.

### 4. AI Insight Generation
- [ ] **Generate AI Reflection**: On a saved journal entry, tap **"Generate AI Insight"**.
- [ ] **Review Reflection**: Verify the AI-generated empathetic response, sentiment analysis tags, and coping suggestions.
- [ ] **Dismiss / Save Insight**: Test saving or dismissing an insight.

### 5. Community & Peer Personality Matching
- [ ] **Browse Available Peers**: Open the Community / Peer Support tab to view compatible peer profiles.
- [ ] **Personality Profile Initialization**: Confirm your MBTI and Big Five personality traits are displayed under your profile.

### 6. Peer Chat & Messaging
- [ ] **Send Peer Connection Request**: Send a connection request to an available peer user.
- [ ] **Accept Request & Start Chat**: Accept an incoming connection request.
- [ ] **Real-Time Chat**: Send and receive real-time messages within the peer chat room.

### 7. In-App Notifications
- [ ] **Notification Triggers**: Check for incoming connection badges and system notification updates.
- [ ] **Mark Read**: Tap notifications to mark them as read.

### 8. Profile Editing & Personalization
- [ ] **Edit Profile**: Update your display avatar, bio description, or preferred communication preferences.
- [ ] **Save Profile**: Confirm profile updates persist after closing and re-opening the app.

### 9. Settings & Security Controls
- [ ] **View Account Settings**: Open the Settings menu to inspect privacy and connection block settings.
- [ ] **Block / Disconnect Option**: Test blocking or disconnecting an active connection if needed.

### 10. Submitting In-App Beta Feedback
- [ ] **Open Feedback Dialog**: Tap **"Submit Beta Feedback"** in the Settings / Help menu.
- [ ] **Select Category**: Choose between **Bug Report**, **Suggestion**, or **Feature Request**.
- [ ] **Attach Details & Screenshot**: Provide a clear title, description, and optional screenshot.
- [ ] **Submit**: Confirm submission completes cleanly.

---

## How to Report Critical Crashes or Urgently Flag Issues

If you experience an unexpected app closure or crash:
1. Re-open the SoulCare app. The app automatically dispatches an anonymous crash stack trace and device diagnostic payload to our telemetry server (`/api/telemetry/crash/`).
2. Alternatively, navigate to **Settings → Submit Beta Feedback** to describe what actions caused the issue.

Thank you for contributing to the SoulCare Closed Beta!
