import 'package:flutter/material.dart';

/// Premium Mental Wellness Color Palette System for SoulCare Design System.
/// Defines all primary, secondary, accent, neutral, surface, and mood rating colors.
abstract class AppColors {
  // ---------------------------------------------------------------------------
  // Core Brand Color Tokens (Mental Wellness Palette)
  // ---------------------------------------------------------------------------
  /// Lavender Purple - Primary Brand Color (Calming & Intuitive)
  static const Color lavenderPrimary = Color(0xFF7C6EF6);
  static const Color lavenderLight = Color(0xFFA78BFA);
  static const Color lavenderDark = Color(0xFF5B4BD8);
  static const Color lavenderContainerLight = Color(0xFFEDE9FE);
  static const Color lavenderContainerDark = Color(0xFF2E246A);

  /// Soft Indigo - Secondary Brand Color (Focus & Tranquility)
  static const Color softIndigo = Color(0xFF6366F1);
  static const Color softIndigoLight = Color(0xFF818CF8);
  static const Color softIndigoDark = Color(0xFF4338CA);
  static const Color softIndigoContainerLight = Color(0xFFE0E7FF);
  static const Color softIndigoContainerDark = Color(0xFF1E1B4B);

  /// Mint Green - Tertiary Accent Color (Healing & Positivity)
  static const Color mintGreen = Color(0xFF10B981);
  static const Color mintGreenLight = Color(0xFF34D399);
  static const Color mintGreenDark = Color(0xFF059669);
  static const Color mintContainerLight = Color(0xFFD1FAE5);
  static const Color mintContainerDark = Color(0xFF064E3B);

  /// Warm Yellow - Accent Color (Optimism & Energy)
  static const Color warmYellow = Color(0xFFFFD166);
  static const Color warmYellowLight = Color(0xFFFFE399);
  static const Color warmYellowDark = Color(0xFFD9A000);
  static const Color yellowContainerLight = Color(0xFFFFFBEB);
  static const Color yellowContainerDark = Color(0xFF451A03);

  /// Coral Accent - Highlight & Warm Accent (Empathy & Care)
  static const Color coralAccent = Color(0xFFF43F5E);
  static const Color coralAccentLight = Color(0xFFFB7185);
  static const Color coralAccentDark = Color(0xFFE11D48);
  static const Color coralContainerLight = Color(0xFFFFE4E6);
  static const Color coralContainerDark = Color(0xFF4C0519);

  // ---------------------------------------------------------------------------
  // Neutral & Surface Color Tokens
  // ---------------------------------------------------------------------------
  /// Calm White - Light Theme Background
  static const Color calmWhiteBackground = Color(0xFFFAFAFC);
  static const Color pureWhite = Color(0xFFFFFFFF);

  /// Deep Charcoal - Dark Theme Background & Slate Text
  static const Color deepCharcoalBackground = Color(0xFF0F172A);
  static const Color slateCardDark = Color(0xFF1E293B);
  static const Color slateBorderDark = Color(0xFF334155);

  /// Text Tokens (Light Theme)
  static const Color textPrimaryLight = Color(0xFF0F172A);
  static const Color textSecondaryLight = Color(0xFF475569);
  static const Color textMutedLight = Color(0xFF94A3B8);

  /// Text Tokens (Dark Theme)
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFFCBD5E1);
  static const Color textMutedDark = Color(0xFF64748B);

  /// Divider & Border Tokens
  static const Color borderLight = Color(0xFFE2E8F0);
  static const Color borderDark = Color(0xFF334155);

  /// Feedback & Semantic Status Colors
  static const Color errorRed = Color(0xFFEF4444);
  static const Color errorRedLight = Color(0xFFFCA5A5);
  static const Color successGreen = Color(0xFF10B981);
  static const Color warningAmber = Color(0xFFF59E0B);
  static const Color infoBlue = Color(0xFF3B82F6);

  // ---------------------------------------------------------------------------
  // Mood Rating Palette (1 to 5 Wellness Score Scale)
  // ---------------------------------------------------------------------------
  static const Color moodVeryBad = Color(0xFFF87171);  // Score 1 - Coral Red
  static const Color moodBad = Color(0xFFFBBF24);      // Score 2 - Amber Yellow
  static const Color moodNeutral = Color(0xFFFACC15);  // Score 3 - Warm Gold
  static const Color moodGood = Color(0xFF4ADE80);     // Score 4 - Soft Emerald
  static const Color moodVeryGood = Color(0xFF60A5FA); // Score 5 - Sky Blue

  /// Utility method to get mood color by integer rating (1 to 5)
  static Color getMoodColor(int rating) {
    switch (rating) {
      case 1:
        return moodVeryBad;
      case 2:
        return moodBad;
      case 3:
        return moodNeutral;
      case 4:
        return moodGood;
      case 5:
        return moodVeryGood;
      default:
        return moodNeutral;
    }
  }

  // ---------------------------------------------------------------------------
  // Material 3 ColorScheme Builders
  // ---------------------------------------------------------------------------
  /// Material 3 Light Mode ColorScheme
  static ColorScheme get lightColorScheme => const ColorScheme(
        brightness: Brightness.light,
        primary: lavenderPrimary,
        onPrimary: pureWhite,
        primaryContainer: lavenderContainerLight,
        onPrimaryContainer: lavenderDark,
        secondary: softIndigo,
        onSecondary: pureWhite,
        secondaryContainer: softIndigoContainerLight,
        onSecondaryContainer: softIndigoDark,
        tertiary: mintGreen,
        onTertiary: pureWhite,
        tertiaryContainer: mintContainerLight,
        onTertiaryContainer: mintGreenDark,
        error: errorRed,
        onError: pureWhite,
        errorContainer: Color(0xFFFEE2E2),
        onErrorContainer: Color(0xFF991B1B),
        background: calmWhiteBackground,
        onBackground: textPrimaryLight,
        surface: pureWhite,
        onSurface: textPrimaryLight,
        surfaceVariant: Color(0xFFF1F5F9),
        onSurfaceVariant: textSecondaryLight,
        outline: borderLight,
        outlineVariant: Color(0xFFCBD5E1),
        shadow: Color(0x1A000000),
        scrim: Color(0x80000000),
      );

  /// Material 3 Dark Mode ColorScheme
  static ColorScheme get darkColorScheme => const ColorScheme(
        brightness: Brightness.dark,
        primary: lavenderLight,
        onPrimary: Color(0xFF1E1B4B),
        primaryContainer: lavenderContainerDark,
        onPrimaryContainer: lavenderLight,
        secondary: softIndigoLight,
        onSecondary: Color(0xFF1E1B4B),
        secondaryContainer: softIndigoContainerDark,
        onSecondaryContainer: softIndigoLight,
        tertiary: mintGreenLight,
        onTertiary: Color(0xFF064E3B),
        tertiaryContainer: mintContainerDark,
        onTertiaryContainer: mintGreenLight,
        error: errorRedLight,
        onError: Color(0xFF7F1D1D),
        errorContainer: Color(0xFF991B1B),
        onErrorContainer: errorRedLight,
        background: deepCharcoalBackground,
        onBackground: textPrimaryDark,
        surface: slateCardDark,
        onSurface: textPrimaryDark,
        surfaceVariant: Color(0xFF334155),
        onSurfaceVariant: textSecondaryDark,
        outline: borderDark,
        outlineVariant: Color(0xFF475569),
        shadow: Color(0x40000000),
        scrim: Color(0xB3000000),
      );
}
