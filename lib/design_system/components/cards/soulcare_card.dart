import 'package:flutter/material.dart';
import '../../radius/app_radius.dart';
import '../../shadows/app_shadows.dart';

/// Reusable Mental Wellness Card Component for SoulCare Design System.
/// Provides smooth surface cards, interactive clickable cards with ink ripples, and custom shadows.
class SoulCareCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry? padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final BorderSide? border;
  final List<BoxShadow>? shadows;
  final BorderRadius? borderRadius;

  const SoulCareCard({
    Key? key,
    required this.child,
    this.padding,
    this.margin,
    this.onTap,
    this.backgroundColor,
    this.border,
    this.shadows,
    this.borderRadius,
  }) : super(key: key);

  /// Factory constructor for Clickable Card with ink ripple effect
  factory SoulCareCard.clickable({
    Key? key,
    required Widget child,
    required VoidCallback onTap,
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
    Color? backgroundColor,
  }) {
    return SoulCareCard(
      key: key,
      child: child,
      onTap: onTap,
      padding: padding,
      margin: margin,
      backgroundColor: backgroundColor,
    );
  }

  /// Factory constructor for Outlined Border Card
  factory SoulCareCard.outlined({
    Key? key,
    required Widget child,
    EdgeInsetsGeometry? padding,
    EdgeInsetsGeometry? margin,
    VoidCallback? onTap,
    Color? borderColor,
  }) {
    return SoulCareCard(
      key: key,
      child: child,
      onTap: onTap,
      padding: padding,
      margin: margin,
      border: BorderSide(color: borderColor ?? const Color(0xFFE2E8F0), width: 1.2),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final effectiveRadius = borderRadius ?? AppRadius.large;
    final effectiveBg = backgroundColor ?? colorScheme.surface;
    final effectiveShadows = shadows ?? (theme.brightness == Brightness.light ? AppShadows.lightSmall : AppShadows.darkSmall);

    final cardContent = Container(
      padding: padding ?? const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: effectiveRadius,
        border: border != null ? Border.all(color: border!.color, width: border!.width) : null,
        boxShadow: border == null ? effectiveShadows : null,
      ),
      child: child,
    );

    if (margin != null) {
      return Padding(
        padding: margin!,
        child: _buildInkWellWrapper(context, cardContent, effectiveRadius),
      );
    }

    return _buildInkWellWrapper(context, cardContent, effectiveRadius);
  }

  Widget _buildInkWellWrapper(BuildContext context, Widget child, BorderRadius radius) {
    if (onTap == null) return child;

    return Material(
      color: Colors.transparent,
      borderRadius: radius,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        child: child,
      ),
    );
  }
}
