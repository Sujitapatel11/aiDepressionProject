import 'dart:ui';
import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Premium Glassmorphic Container Card with BackdropBlur for SoulCare.
class GlassCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final double blurAmount;
  final double opacity;
  final BorderRadius? borderRadius;

  const GlassCard({
    Key? key,
    required this.child,
    this.padding = const EdgeInsets.all(20.0),
    this.margin,
    this.blurAmount = 15.0,
    this.opacity = 0.65,
    this.borderRadius,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final effectiveRadius = borderRadius ?? AppRadius.large;

    final Widget cardBody = ClipRRect(
      borderRadius: effectiveRadius,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blurAmount, sigmaY: blurAmount),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF1E293B).withOpacity(opacity)
                : const Color(0xFFFFFFFF).withOpacity(opacity),
            borderRadius: effectiveRadius,
            border: Border.all(
              color: isDark
                  ? const Color(0xFF334155).withOpacity(0.5)
                  : const Color(0xFFFFFFFF).withOpacity(0.8),
              width: 1.2,
            ),
            boxShadow: isDark ? AppShadows.darkSmall : AppShadows.lightSmall,
          ),
          child: child,
        ),
      ),
    );

    if (margin != null) {
      return Padding(padding: margin!, child: cardBody);
    }
    return cardBody;
  }
}
