import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Standard Surface Card Component for SoulCare with smooth rounded corners and optional InkWell ripple.
class AppCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry? margin;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final BorderSide? border;

  const AppCard({
    Key? key,
    required this.child,
    this.padding = const EdgeInsets.all(20.0),
    this.margin,
    this.onTap,
    this.backgroundColor,
    this.border,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isDark = theme.brightness == Brightness.dark;
    final effectiveBg = backgroundColor ?? colorScheme.surface;
    final effectiveShadows = isDark ? AppShadows.darkSmall : AppShadows.lightSmall;

    final Widget cardBody = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: effectiveBg,
        borderRadius: AppRadius.large,
        border: border != null ? Border.all(color: border!.color, width: border!.width) : null,
        boxShadow: border == null ? effectiveShadows : null,
      ),
      child: child,
    );

    Widget effectiveWidget = cardBody;

    if (onTap != null) {
      effectiveWidget = Material(
        color: Colors.transparent,
        borderRadius: AppRadius.large,
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          borderRadius: AppRadius.large,
          child: cardBody,
        ),
      );
    }

    if (margin != null) {
      return Padding(padding: margin!, child: effectiveWidget);
    }

    return effectiveWidget;
  }
}
