import 'package:flutter/material.dart';

/// Shadow & Elevation System for SoulCare Design System.
/// Provides soft, layered elevation shadows for Cards, Modals, Buttons, and Glow states.
abstract class AppShadows {
  // ---------------------------------------------------------------------------
  // Light Theme Elevation Shadows
  // ---------------------------------------------------------------------------
  /// Subtle elevation for cards and input containers
  static const List<BoxShadow> lightSmall = [
    BoxShadow(
      color: Color(0x0A000000), // 4% Opacity Black
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  /// Standard elevation for floating cards and buttons
  static const List<BoxShadow> lightMedium = [
    BoxShadow(
      color: Color(0x0F7C6EF6), // 6% Opacity Brand Lavender
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
    BoxShadow(
      color: Color(0x0A000000),
      blurRadius: 6,
      offset: Offset(0, 2),
    ),
  ];

  /// Deep elevation for Bottom Sheets, Modals, and Dialogs
  static const List<BoxShadow> lightLarge = [
    BoxShadow(
      color: Color(0x1A7C6EF6), // 10% Opacity Lavender
      blurRadius: 32,
      offset: Offset(0, 8),
    ),
    BoxShadow(
      color: Color(0x0D000000),
      blurRadius: 12,
      offset: Offset(0, 4),
    ),
  ];

  /// Soft brand glow for focused inputs or primary action buttons
  static const List<BoxShadow> brandGlow = [
    BoxShadow(
      color: Color(0x337C6EF6), // 20% Opacity Lavender Glow
      blurRadius: 20,
      spreadRadius: 2,
      offset: Offset(0, 4),
    ),
  ];

  // ---------------------------------------------------------------------------
  // Dark Theme Elevation Shadows
  // ---------------------------------------------------------------------------
  static const List<BoxShadow> darkSmall = [
    BoxShadow(
      color: Color(0x40000000), // 25% Opacity Black
      blurRadius: 8,
      offset: Offset(0, 2),
    ),
  ];

  static const List<BoxShadow> darkMedium = [
    BoxShadow(
      color: Color(0x66000000), // 40% Opacity Black
      blurRadius: 16,
      offset: Offset(0, 4),
    ),
  ];

  static const List<BoxShadow> darkLarge = [
    BoxShadow(
      color: Color(0x80000000), // 50% Opacity Black
      blurRadius: 32,
      offset: Offset(0, 8),
    ),
  ];
}
