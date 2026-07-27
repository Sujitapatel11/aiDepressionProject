import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// Custom PageRouteBuilder providing smooth fade & slide transitions between screens.
class SoulCarePageRoute<T> extends PageRouteBuilder<T> {
  final Widget page;

  SoulCarePageRoute({required this.page})
      : super(
          pageBuilder: (context, animation, secondaryAnimation) => page,
          transitionDuration: AppAnimations.normal,
          reverseTransitionDuration: AppAnimations.normal,
          transitionsBuilder: (context, animation, secondaryAnimation, child) {
            final curvedAnimation = CurvedAnimation(
              parent: animation,
              curve: AppAnimations.decelerate,
            );

            return FadeTransition(
              opacity: curvedAnimation,
              child: SlideTransition(
                position: Tween<Offset>(
                  begin: const Offset(0.05, 0.0),
                  end: Offset.zero,
                ).animate(curvedAnimation),
                child: child,
              ),
            );
          },
        );
}
