import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Standardized base container card enforcing unified padding, radius, elevation, RepaintBoundary, and press animation
class BaseDashboardCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final double borderRadius;
  final Color? borderColor;
  final Color? backgroundColor;
  final VoidCallback? onTap;
  final String? semanticLabel;

  const BaseDashboardCard({
    Key? key,
    required this.child,
    this.padding = const EdgeInsets.all(20),
    this.borderRadius = 24.0,
    this.borderColor,
    this.backgroundColor,
    this.onTap,
    this.semanticLabel,
  }) : super(key: key);

  @override
  State<BaseDashboardCard> createState() => _BaseDashboardCardState();
}

class _BaseDashboardCardState extends State<BaseDashboardCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _scaleController;
  late final Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _scaleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 0.98).animate(
      CurvedAnimation(parent: _scaleController, curve: Curves.easeOutCubic),
    );
  }

  @override
  void dispose() {
    _scaleController.dispose();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    if (widget.onTap != null) _scaleController.forward();
  }

  void _onTapUp(TapUpDetails details) {
    if (widget.onTap != null) _scaleController.reverse();
  }

  void _onTapCancel() {
    if (widget.onTap != null) _scaleController.reverse();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultBg = isDark ? const Color(0xFF1E293B) : Colors.white;
    final defaultBorder = isDark
        ? const Color(0xFF334155)
        : AppTheme.lavenderPrimary.withOpacity(0.12);

    final cardContent = RepaintBoundary(
      child: AnimatedBuilder(
        animation: _scaleAnimation,
        builder: (context, child) => Transform.scale(
          scale: _scaleAnimation.value,
          child: child,
        ),
        child: Container(
          padding: widget.padding,
          decoration: BoxDecoration(
            color: widget.backgroundColor ?? defaultBg,
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: widget.borderColor ?? defaultBorder,
            ),
            boxShadow: [
              BoxShadow(
                color: AppTheme.lavenderPrimary.withOpacity(0.06),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: widget.child,
        ),
      ),
    );

    if (widget.onTap == null) {
      if (widget.semanticLabel != null) {
        return Semantics(
          label: widget.semanticLabel,
          child: cardContent,
        );
      }
      return cardContent;
    }

    return Semantics(
      label: widget.semanticLabel,
      button: true,
      child: GestureDetector(
        onTapDown: _onTapDown,
        onTapUp: _onTapUp,
        onTapCancel: _onTapCancel,
        onTap: widget.onTap,
        child: cardContent,
      ),
    );
  }
}
