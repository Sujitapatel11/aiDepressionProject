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
        primary: Color(0xFFD0BCFF),
        secondary: Color(0xFF81C784),
        background: Color(0xFF141218),
        surface: Color(0xFF1D1B20),
        error: Color(0xFFF2B8B5),
      ),
      scaffoldBackgroundColor: const Color(0xFF141218),
      fontFamily: 'PlusJakartaSans',
    );
  }
}
