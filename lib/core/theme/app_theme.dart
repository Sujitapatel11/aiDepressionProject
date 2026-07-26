import 'package:flutter/material.dart';

/// Material Design 3 Calming Palette & Theme System for SoulCare
class AppTheme {
  // Color Palette Tokens
  static const Color lavenderPrimary = Color(0xFF6750A4);
  static const Color lavenderSurfaceTint = Color(0xFFE8DEF8);
  static const Color lavenderBackground = Color(0xFFF7F5FA);
  
  static const Color mintAccent = Color(0xFF2D6A4F);
  static const Color mintLight = Color(0xFFE8F5E9);

  static const Color textMain = Color(0xFF1D1B20);
  static const Color textSub = Color(0xFF49454F);
  static const Color textMuted = Color(0xFF79747E);

  static const Color errorRed = Color(0xFFB3261E);

  // Mood Score Colors (1 to 5 scale)
  static const Color moodVeryBad = Color(0xFFE57373);
  static const Color moodBad = Color(0xFFFFB74D);
  static const Color moodNeutral = Color(0xFFFFD54F);
  static const Color moodGood = Color(0xFF81C784);
  static const Color moodVeryGood = Color(0xFF64B5F6);

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
        secondary: mintAccent,
        background: lavenderBackground,
        surface: Colors.white,
        error: errorRed,
      ),
      scaffoldBackgroundColor: lavenderBackground,
      fontFamily: 'PlusJakartaSans',
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardTheme(
        elevation: 0.5,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        color: Colors.white,
      ),
      navigationBarTheme: NavigationBarThemeData(
        elevation: 2,
        backgroundColor: Colors.white,
        indicatorColor: lavenderSurfaceTint,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: lavenderPrimary,
        foregroundColor: Colors.white,
        elevation: 3,
        shape: StadiumBorder(),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFFF8F7FC),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE6E1E5)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFE6E1E5)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: lavenderPrimary, width: 1.8),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: errorRed, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: errorRed, width: 1.8),
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
        primary: const Color(0xFFD0BCFF),
        secondary: const Color(0xFF81C784),
        background: const Color(0xFF141218),
        surface: const Color(0xFF1D1B20),
        error: const Color(0xFFF2B8B5),
      ),
      scaffoldBackgroundColor: const Color(0xFF141218),
      fontFamily: 'PlusJakartaSans',
      appBarTheme: const AppBarTheme(
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
      ),
      cardTheme: CardTheme(
        elevation: 0,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        color: const Color(0xFF2B2831),
      ),
      navigationBarTheme: const NavigationBarThemeData(
        elevation: 2,
        backgroundColor: Color(0xFF1D1B20),
        indicatorColor: Color(0xFF4A4458),
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: Color(0xFFD0BCFF),
        foregroundColor: Color(0xFF381E72),
        elevation: 3,
        shape: StadiumBorder(),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF2B2831),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF49454F)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF49454F)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFFD0BCFF), width: 1.8),
        ),
      ),
    );
  }
}

