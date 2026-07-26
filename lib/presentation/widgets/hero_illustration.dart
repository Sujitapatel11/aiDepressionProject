import 'dart:math';
import 'package:flutter/material.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE LUXURY HERO ILLUSTRATION ARTWORK
/// Calm, geometric, organic glowing aura vector illustration for Top 45% Hero.
/// ════════════════════════════════════════════════════════════════════════════

class HeroIllustration extends StatefulWidget {
  final double size;

  const HeroIllustration({
    Key? key,
    this.size = 140,
  }) : super(key: key);

  @override
  State<HeroIllustration> createState() => _HeroIllustrationState();
}

class _HeroIllustrationState extends State<HeroIllustration>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _pulseAnimation;
  late Animation<double> _rotationAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 4000),
    )..repeat(reverse: true);

    _pulseAnimation = Tween<double>(begin: 0.94, end: 1.06).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.easeInOutSine,
      ),
    );

    _rotationAnimation = Tween<double>(begin: 0, end: 2 * pi).animate(
      CurvedAnimation(
        parent: _controller,
        curve: Curves.linear,
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double s = widget.size;

    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        return Transform.scale(
          scale: _pulseAnimation.value,
          child: SizedBox(
            width: s,
            height: s,
            child: Stack(
              alignment: Alignment.center,
              children: [
                // Outer Ambient Aura Glow
                Container(
                  width: s * 0.9,
                  height: s * 0.9,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF7C6EF6).withOpacity(0.35),
                        blurRadius: s * 0.45,
                        spreadRadius: 8,
                      ),
                      BoxShadow(
                        color: const Color(0xFF8DD8C8).withOpacity(0.35),
                        blurRadius: s * 0.4,
                        spreadRadius: -4,
                      ),
                    ],
                  ),
                ),

                // Rotating Geometric Petals Vector Paint
                Transform.rotate(
                  angle: _rotationAnimation.value * 0.05,
                  child: CustomPaint(
                    size: Size(s, s),
                    painter: _HeroVectorPainter(),
                  ),
                ),

                // Center Lotus Emblem Badge
                Container(
                  width: s * 0.48,
                  height: s * 0.48,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [
                        Color(0xFF7C6EF6),
                        Color(0xFF6366F1),
                      ],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF7C6EF6).withOpacity(0.4),
                        blurRadius: 18,
                        offset: const Offset(0, 6),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.spa_rounded,
                    color: Colors.white,
                    size: 34,
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _HeroVectorPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double cx = size.width / 2;
    final double cy = size.height / 2;
    final double radius = size.width * 0.36;

    final Paint ringPaint = Paint()
      ..color = Colors.white.withOpacity(0.35)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.8;

    final Paint petalPaint = Paint()
      ..color = const Color(0xFF8DD8C8).withOpacity(0.25)
      ..style = PaintingStyle.fill;

    // Draw 6 symmetrical soft petal shapes
    for (int i = 0; i < 6; i++) {
      final double angle = (i * pi / 3);
      final double px = cx + cos(angle) * (radius * 0.55);
      final double py = cy + sin(angle) * (radius * 0.55);

      canvas.drawCircle(Offset(px, py), radius * 0.45, petalPaint);
      canvas.drawCircle(Offset(px, py), radius * 0.45, ringPaint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
