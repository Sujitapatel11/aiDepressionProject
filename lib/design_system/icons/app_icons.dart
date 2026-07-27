import 'package:flutter/material.dart';

/// Iconography Token System for SoulCare Design System.
/// Standardizes icon sizing tokens and provides centralized IconData mappings for app domains.
abstract class AppIcons {
  // ---------------------------------------------------------------------------
  // Icon Sizing Tokens (dp)
  // ---------------------------------------------------------------------------
  static const double sizeXSmall = 16.0;
  static const double sizeSmall = 20.0;
  static const double sizeMedium = 24.0;
  static const double sizeLarge = 32.0;
  static const double sizeXLarge = 48.0;

  // ---------------------------------------------------------------------------
  // Navigation Icon Tokens
  // ---------------------------------------------------------------------------
  static const IconData home = Icons.grid_view_rounded;
  static const IconData journal = Icons.import_contacts_rounded;
  static const IconData mood = Icons.sentiment_satisfied_alt_rounded;
  static const IconData community = Icons.people_alt_rounded;
  static const IconData profile = Icons.person_rounded;
  static const IconData settings = Icons.settings_rounded;
  static const IconData back = Icons.arrow_back_ios_new_rounded;
  static const IconData close = Icons.close_rounded;

  // ---------------------------------------------------------------------------
  // Mental Wellness Domain Icons
  // ---------------------------------------------------------------------------
  static const IconData aiInsight = Icons.auto_awesome_rounded;
  static const IconData reflection = Icons.edit_note_rounded;
  static const IconData support = Icons.volunteer_activism_rounded;
  static const IconData chat = Icons.forum_rounded;
  static const IconData send = Icons.send_rounded;
  static const IconData notification = Icons.notifications_rounded;
  static const IconData feedback = Icons.rate_review_rounded;
  static const IconData lock = Icons.lock_outline_rounded;
  static const IconData visibility = Icons.visibility_outlined;
  static const IconData visibilityOff = Icons.visibility_off_outlined;

  // ---------------------------------------------------------------------------
  // Mood Rating Icons (1 to 5)
  // ---------------------------------------------------------------------------
  static const IconData moodVeryBad = Icons.sentiment_very_dissatisfied_rounded;
  static const IconData moodBad = Icons.sentiment_dissatisfied_rounded;
  static const IconData moodNeutral = Icons.sentiment_neutral_rounded;
  static const IconData moodGood = Icons.sentiment_satisfied_rounded;
  static const IconData moodVeryGood = Icons.sentiment_very_satisfied_rounded;
}
