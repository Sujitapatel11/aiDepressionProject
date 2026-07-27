import 'package:flutter/material.dart';

/// Spacing System for SoulCare Design System.
/// Defines grid spacing constants (4, 8, 12, 16, 20, 24, 32, 40, 48), SizedBox gaps, and EdgeInsets shortcuts.
abstract class AppSpacing {
  // ---------------------------------------------------------------------------
  // Base Grid Spacing Tokens (dp)
  // ---------------------------------------------------------------------------
  static const double xxxSmall = 4.0;
  static const double xxSmall = 8.0;
  static const double xSmall = 12.0;
  static const double small = 16.0;
  static const double medium = 20.0;
  static const double large = 24.0;
  static const double xLarge = 32.0;
  static const double xxLarge = 40.0;
  static const double xxxLarge = 48.0;

  // ---------------------------------------------------------------------------
  // Vertical SizedBox Gap Helpers
  // ---------------------------------------------------------------------------
  static const SizedBox gapV4 = SizedBox(height: xxxSmall);
  static const SizedBox gapV8 = SizedBox(height: xxSmall);
  static const SizedBox gapV12 = SizedBox(height: xSmall);
  static const SizedBox gapV16 = SizedBox(height: small);
  static const SizedBox gapV20 = SizedBox(height: medium);
  static const SizedBox gapV24 = SizedBox(height: large);
  static const SizedBox gapV32 = SizedBox(height: xLarge);
  static const SizedBox gapV40 = SizedBox(height: xxLarge);
  static const SizedBox gapV48 = SizedBox(height: xxxLarge);

  // ---------------------------------------------------------------------------
  // Horizontal SizedBox Gap Helpers
  // ---------------------------------------------------------------------------
  static const SizedBox gapH4 = SizedBox(width: xxxSmall);
  static const SizedBox gapH8 = SizedBox(width: xxSmall);
  static const SizedBox gapH12 = SizedBox(width: xSmall);
  static const SizedBox gapH16 = SizedBox(width: small);
  static const SizedBox gapH20 = SizedBox(width: medium);
  static const SizedBox gapH24 = SizedBox(width: large);
  static const SizedBox gapH32 = SizedBox(width: xLarge);
  static const SizedBox gapH40 = SizedBox(width: xxLarge);
  static const SizedBox gapH48 = SizedBox(width: xxxLarge);

  // ---------------------------------------------------------------------------
  // EdgeInsets Padding Helpers
  // ---------------------------------------------------------------------------
  static const EdgeInsets zero = EdgeInsets.zero;

  static const EdgeInsets all4 = EdgeInsets.all(xxxSmall);
  static const EdgeInsets all8 = EdgeInsets.all(xxSmall);
  static const EdgeInsets all12 = EdgeInsets.all(xSmall);
  static const EdgeInsets all16 = EdgeInsets.all(small);
  static const EdgeInsets all20 = EdgeInsets.all(medium);
  static const EdgeInsets all24 = EdgeInsets.all(large);
  static const EdgeInsets all32 = EdgeInsets.all(xLarge);

  static const EdgeInsets horizontal8 = EdgeInsets.symmetric(horizontal: xxSmall);
  static const EdgeInsets horizontal16 = EdgeInsets.symmetric(horizontal: small);
  static const EdgeInsets horizontal20 = EdgeInsets.symmetric(horizontal: medium);
  static const EdgeInsets horizontal24 = EdgeInsets.symmetric(horizontal: large);

  static const EdgeInsets vertical8 = EdgeInsets.symmetric(vertical: xxSmall);
  static const EdgeInsets vertical12 = EdgeInsets.symmetric(vertical: xSmall);
  static const EdgeInsets vertical16 = EdgeInsets.symmetric(vertical: small);
  static const EdgeInsets vertical20 = EdgeInsets.symmetric(vertical: medium);

  static const EdgeInsets screenPadding = EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0);
  static const EdgeInsets cardPadding = EdgeInsets.all(20.0);
  static const EdgeInsets modalPadding = EdgeInsets.symmetric(horizontal: 24.0, vertical: 24.0);
}
