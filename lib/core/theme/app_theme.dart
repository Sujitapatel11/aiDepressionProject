import 'package:flutter/material.dart';
import '../../design_system/design_system.dart';

/// Legacy Theme Bridge for SoulCare.
/// Delegates all theme data, palette tokens, and mood colors directly to the single source of truth: `SoulCareTheme` and `AppColors` in `lib/design_system/`.
abstract class AppTheme {
  // Brand Color Palette Tokens (Delegated to AppColors)
  static const Color lavenderPrimary = AppColors.lavenderPrimary;
  static const Color mintSecondary = AppColors.mintGreen;
  static const Color softYellowAccent = AppColors.warmYellow;
  static const Color appBackground = AppColors.calmWhiteBackground;

  static const Color textMain = AppColors.textPrimaryLight;
  static const Color textSub = AppColors.textSecondaryLight;
  static const Color textMuted = AppColors.textMutedLight;

  static const Color errorRed = AppColors.errorRed;

  // Mood Score Colors (Delegated to AppColors)
  static const Color moodVeryBad = AppColors.moodVeryBad;
  static const Color moodBad = AppColors.moodBad;
  static const Color moodNeutral = AppColors.moodNeutral;
  static const Color moodGood = AppColors.moodGood;
  static const Color moodVeryGood = AppColors.moodVeryGood;

  /// Delegated Mood Color Helper
  static Color getMoodColor(int rating) => AppColors.getMoodColor(rating);

  /// Light Mode Theme (Delegated to SoulCareTheme)
  static ThemeData get lightTheme => SoulCareTheme.lightTheme;

  /// Dark Mode Theme (Delegated to SoulCareTheme)
  static ThemeData get darkTheme => SoulCareTheme.darkTheme;
}
