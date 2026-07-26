import 'dart:math';
import 'package:flutter/material.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// PEACEFUL PERSON ILLUSTRATION (WITH GLOWING SUN ☀️, LEAVES 🍃 & PARTICLES)
/// Custom vector artwork for SoulCare Login Header matching the ASCII wireframe.
/// ════════════════════════════════════════════════════════════════════════════

class PeacefulPersonIllustration extends StatefulWidget {
  final double size;

  const PeacefulPersonIllustration({
    Key? key,
    this.size = 150,
  }) : super(key: key);

  @override
  State<PeacefulPersonIllustration> createState() =>
      _PeacefulPersonIllustrationState();
}

class _PeacefulPersonIllustrationState
    extends State<PeacefulPersonIllustration> with TickerProviderStateMixin {
  late AnimationController _breathingController;
  late Animation<double> _breatheScale;

  late AnimationController _leafController;
  late Animation<double> _leafFloat;

  @override
  void initState() {
    super.initState();

    _breathingController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 3200),
    )..repeat(reverse: true);

    _breatheScale = Tween<double>(begin: 0.96, end: 1.04).animate(
      CurvedAnimation(
        parent: _breathingController,
        curve: Curves.easeInOutSine,
      ),
    );

    _leafController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2500),
    )..repeat(reverse: true);

    _leafFloat = Tween<double>(begin: -8.0, end: 8.0).animate(
      CurvedAnimation(
        parent: _leafController,
        curve: Curves.easeInOutSine,
      ),
    );
  }

  @override
  void dispose() {
    _breathingController.dispose();
    _leafController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double s = widget.size;

    return SizedBox(
      width: s * 1.2,
      height: s,
      child: Stack(
        alignment: Alignment.center,
        children: [
          // ☀️ Animated Glowing Sun Accent in Background
          Positioned(
            top: 2,
            right: s * 0.15,
            child: AnimatedBuilder(
              animation: _breathingController,
              builder: (context, child) {
                return Transform.scale(
                  scale: _breatheScale.value,
                  child: Container(
                    width: s * 0.38,
                    height: s * 0.38,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: const RadialGradient(
                        colors: [
                          Color(0xFFFFD166),
                          Color(0xFFFFB703),
                        ],
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFFFFD166).withOpacity(0.5),
                          blurRadius: 20,
                          spreadRadius: 4,
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),

          // Calming Aura Glow Center
          Container(
            width: s * 0.75,
            height: s * 0.75,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF7C6EF6).withOpacity(0.22),
                  blurRadius: s * 0.4,
                  spreadRadius: 6,
                ),
                BoxShadow(
                  color: const Color(0xFF8DD8C8).withOpacity(0.3),
                  blurRadius: s * 0.35,
                  spreadRadius: -2,
                ),
              ],
            ),
          ),

          // Vector Drawing of Person Sitting Peacefully in Lotus Pose
          AnimatedBuilder(
            animation: _breathingController,
            builder: (context, child) {
              return Transform.scale(
                scale: _breatheScale.value,
                child: CustomPaint(
                  size: Size(s * 0.9, s * 0.85),
                  painter: _PersonPainter(),
                ),
              );
            },
          ),

          // Floating Leaf 🍃 1
          Positioned(
            top: s * 0.18,
            left: s * 0.08,
            child: AnimatedBuilder(
              animation: _leafController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, _leafFloat.value),
                  child: Transform.rotate(
                    angle: -0.2,
                    child: const Icon(
                      Icons.eco_rounded,
                      size: 20,
                      color: Color(0xFF8DD8C8),
                    ),
                  ),
                );
              },
            ),
          ),

          // Floating Leaf 🍃 2
          Positioned(
            bottom: s * 0.2,
            right: s * 0.06,
            child: AnimatedBuilder(
              animation: _leafController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, -_leafFloat.value),
                  child: Transform.rotate(
                    angle: 0.3,
                    child: const Icon(
                      Icons.eco_rounded,
                      size: 24,
                      color: Color(0xFF2D6A4F),
                    ),
                  ),
                );
              },
            ),
          ),

          // Glowing Floating Sparkle Particles
          Positioned(
            top: s * 0.28,
            right: s * 0.25,
            child: Container(
              width: 8,
              height: 8,
              decoration: const BoxDecoration(
                color: Color(0xFFFFD166),
                shape: BoxShape.circle,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Custom Vector Painter for Person in Lotus Meditation Pose
class _PersonPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final Paint bodyPaint = Paint()
      ..shader = const LinearGradient(
        colors: [
          Color(0xFF7C6EF6),
          Color(0xFF6366F1),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, w, h));

    final Paint headPaint = Paint()
      ..color = const Color(0xFFFED7AA); // Soft warm skin tone

    final Paint hairPaint = Paint()
      ..color = const Color(0xFF334155);

    // Head
    canvas.drawCircle(Offset(w * 0.5, h * 0.28), w * 0.14, headPaint);

    // Hair bun / crown
    canvas.drawCircle(Offset(w * 0.5, h * 0.16), w * 0.08, hairPaint);

    // Torso / Body (Soft rounded triangle path)
    final Path torsoPath = Path()
      ..moveTo(w * 0.5, h * 0.38)
      ..cubicTo(w * 0.35, h * 0.48, w * 0.25, h * 0.72, w * 0.18, h * 0.85)
      ..cubicTo(w * 0.35, h * 0.95, w * 0.65, h * 0.95, w * 0.82, h * 0.85)
      ..cubicTo(w * 0.75, h * 0.72, w * 0.65, h * 0.48, w * 0.5, h * 0.38)
      ..close();

    canvas.drawPath(torsoPath, bodyPaint);

    // Cross-legged base mat accent
    final Paint matPaint = Paint()
      ..color = const Color(0xFF8DD8C8).withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    canvas.drawOval(
      Rect.fromLTWH(w * 0.1, h * 0.82, w * 0.8, h * 0.14),
      matPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
