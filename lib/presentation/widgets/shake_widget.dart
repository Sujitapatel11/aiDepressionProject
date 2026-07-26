import 'dart:math';
import 'package:flutter/material.dart';

/// Reusable horizontal shake animation widget for form validation error feedback
class ShakeWidget extends StatefulWidget {
  final Widget child;
  final Duration duration;
  final double deltaX;
  final int shakeCount;

  const ShakeWidget({
    Key? key,
    required this.child,
    this.duration = const Duration(milliseconds: 500),
    this.deltaX = 12.0,
    this.shakeCount = 3,
  }) : super(key: key);

  @override
  ShakeWidgetState createState() => ShakeWidgetState();
}

class ShakeWidgetState extends State<ShakeWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: widget.duration);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  /// Trigger the horizontal error shake animation
  void shake() {
    _controller.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final double progress = _controller.value;
        final double offset = sin(progress * widget.shakeCount * 2 * pi) *
            widget.deltaX *
            (1.0 - progress);
        return Transform.translate(
          offset: Offset(offset, 0),
          child: child,
        );
      },
      child: widget.child,
    );
  }
}
