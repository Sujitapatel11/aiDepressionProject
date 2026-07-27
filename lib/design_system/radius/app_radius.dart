import 'package:flutter/material.dart';

/// Corner Radius System for SoulCare Design System.
/// Defines Small, Medium, Large, and Pill radius tokens and BorderRadius shortcuts.
abstract class AppRadius {
  // ---------------------------------------------------------------------------
  // Raw Radius Values (dp)
  // ---------------------------------------------------------------------------
  static const double rawSmall = 8.0;
  static const double rawMedium = 16.0;
  static const double rawLarge = 24.0;
  static const double rawPill = 9999.0;

  // ---------------------------------------------------------------------------
  // Radius Objects
  // ---------------------------------------------------------------------------
  static const Radius radiusSmall = Radius.circular(rawSmall);
  static const Radius radiusMedium = Radius.circular(rawMedium);
  static const Radius radiusLarge = Radius.circular(rawLarge);
  static const Radius radiusPill = Radius.circular(rawPill);

  // ---------------------------------------------------------------------------
  // BorderRadius Objects (Symmetric All Corners)
  // ---------------------------------------------------------------------------
  static const BorderRadius small = BorderRadius.all(radiusSmall);
  static const BorderRadius medium = BorderRadius.all(radiusMedium);
  static const BorderRadius large = BorderRadius.all(radiusLarge);
  static const BorderRadius pill = BorderRadius.all(radiusPill);

  // ---------------------------------------------------------------------------
  // Specialized BorderRadius Shapes
  // ---------------------------------------------------------------------------
  /// Top-only rounded corners for Bottom Sheets and Modals
  static const BorderRadius topSheetMedium = BorderRadius.vertical(top: radiusMedium);
  static const BorderRadius topSheetLarge = BorderRadius.vertical(top: Radius.circular(28.0));

  /// Card Border Radius
  static const BorderRadius card = BorderRadius.all(radiusLarge);

  /// Input Field Border Radius
  static const BorderRadius inputField = BorderRadius.all(Radius.circular(20.0));
}
