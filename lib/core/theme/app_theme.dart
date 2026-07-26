import 'package:flutter/material.dart';

/// Material Design 3 Calming & Playful Palette System for SoulCare Auth Redesign
class AppTheme {
  // Brand Color Palette Tokens (User Design System Specs)
  static const Color lavenderPrimary = Color(0xFF7C6EF6);
  static const Color mintSecondary = Color(0xFF8DD8C8);
  static const Color softYellowAccent = Color(0xFFFFD166);
  static const Color appBackground = Color(0xFFF8FAFC);

  static const Color textMain = Color(0xFF1E293B);
  static const Color textSub = Color(0xFF64748B);
  static const Color textMuted = Color(0xFF94A3B8);

  static const Color errorRed = Color(0xFFEF4444);

  // Mood Score Colors (1 to 5 scale)
  static const Color moodVeryBad = Color(0xFFF87171);
  static const Color moodBad = Color(0xFFFBBF24);
  static const Color moodNeutral = Color(0xFFFACC15);
  static const Color moodGood = Color(0xFF4ADE80);
  static const Color moodVeryGood = Color(0xFF60A5FA);

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

  /// Light Mode Theme (Material Design 3 Compliant)
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: ColorScheme.fromSeed(
        seedColor: lavenderPrimary,
        primary: lavenderPrimary,
        secondary: mintSecondary,
        tertiary: softYellowAccent,
        background: appBackground,
        surface: Colors.white,
        error: errorRed,
      ),
      scaffoldBackgroundColor: appBackground,
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        color: Colors.white,
        shadowColor: const Color(0xFF7C6EF6).withOpacity(0.06),
      ),
      navigationBarTheme: NavigationBarThemeData(
        elevation: 2,
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFEDE9FE),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: lavenderPrimary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: StadiumBorder(),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white,
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: lavenderPrimary, width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: errorRed, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: errorRed, width: 2.0),
        ),
      ),
    );
  }

  /// Dark Mode Theme (Material Design 3 Compliant)
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(
        seedColor: lavenderPrimary,
        brightness: Brightness.dark,
        primary: const Color(0xFFA78BFA),
        secondary: mintSecondary,
        tertiary: softYellowAccent,
        background: const Color(0xFF0F172A),
        surface: const Color(0xFF1E293B),
        error: const Color(0xFFFCA5A5),
      ),
      scaffoldBackgroundColor: const Color(0xFF0F172A),
      fontFamily: 'Inter',
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        color: const Color(0xFF1E293B),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        elevation: 2,
        backgroundColor: Color(0xFF0F172A),
        indicatorColor: Color(0xFF334155),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: Color(0xFFA78BFA),
        foregroundColor: Color(0xFF1E1B4B),
        elevation: 4,
        shape: StadiumBorder(),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF1E293B),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFF334155), width: 1.2),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFF334155), width: 1.2),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: Color(0xFFA78BFA), width: 2.0),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: errorRed, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(20),
          borderSide: const BorderSide(color: errorRed, width: 2.0),
        ),
      ),
    );
  }
}
