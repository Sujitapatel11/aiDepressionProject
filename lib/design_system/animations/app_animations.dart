import 'package:flutter/material.dart';

/// Motion & Animation System for SoulCare Design System.
/// Provides standardized animation durations and Material 3 motion curves.
abstract class AppAnimations {
  // ---------------------------------------------------------------------------
  // Animation Durations
  // ---------------------------------------------------------------------------
  /// Fast duration (150 ms) for micro-interactions, button presses, and toggles
  static const Duration fast = Duration(milliseconds: 150);

  /// Normal duration (300 ms) for page transitions, sheet expansions, and fades
  static const Duration normal = Duration(milliseconds: 300);

  /// Slow duration (500 ms) for complex layout morphs and onboarding carousels
  static const Duration slow = Duration(milliseconds: 500);

  /// Extra slow duration (800 ms) for gentle ambient breathing exercises
  static const Duration extraSlow = Duration(milliseconds: 800);

  // ---------------------------------------------------------------------------
  // Material 3 Animation Curves
  // ---------------------------------------------------------------------------
  /// Material 3 Standard Motion Curve
  static const Curve standard = Curves.easeInOutCubic;

  /// Material 3 Emphasized Motion Curve for prominent transitions
  static const Curve emphasized = Curves.fastOutSlowIn;

  /// Decelerate Curve for incoming elements
  static const Curve decelerate = Curves.easeOutCubic;

  /// Accelerate Curve for exiting elements
  static const Curve accelerate = Curves.easeInCubic;

  /// Calm Ease Curve for soothing mental wellness UI transitions
  static const Curve calmEase = Cubic(0.25, 0.1, 0.25, 1.0);

  /// Gentle Spring Bounce Curve for interactive feedback
  static const Curve gentleSpring = ElasticOutCurve(0.8);
}
