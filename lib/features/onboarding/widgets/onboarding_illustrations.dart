import 'dart:math';
import 'package:flutter/material.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// ONBOARDING ILLUSTRATIONS (CUSTOM VECTOR ARTWORK & BREATHING ANIMATION)
/// ════════════════════════════════════════════════════════════════════════════

class OnboardingIllustrationWidget extends StatefulWidget {
  final int pageIndex;
  final double size;

  const OnboardingIllustrationWidget({
    Key? key,
    required this.pageIndex,
    this.size = 180,
  }) : super(key: key);

  @override
  State<OnboardingIllustrationWidget> createState() =>
      _OnboardingIllustrationWidgetState();
}

class _OnboardingIllustrationWidgetState
    extends State<OnboardingIllustrationWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _breathingController;
  late Animation<double> _breatheScale;

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
  }

  @override
  void dispose() {
    _breathingController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double s = widget.size;

    return AnimatedBuilder(
      animation: _breathingController,
      builder: (context, child) {
        return Transform.scale(
          scale: _breatheScale.value,
          child: SizedBox(
            width: s * 1.2,
            height: s,
            child: CustomPaint(
              size: Size(s * 1.2, s),
              painter: _getPainter(widget.pageIndex),
            ),
          ),
        );
      },
    );
  }

  CustomPainter _getPainter(int index) {
    switch (index) {
      case 0:
        return _MindfulReflectionPainter();
      case 1:
        return _MoodSpectrumLensPainter();
      case 2:
      default:
        return _PeerCanopyPainter();
    }
  }
}

/// Page 1 Vector Painter: Mindful Reflection (Lotus Meditation & Glowing Sun ☀️)
class _MindfulReflectionPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Glowing Background Aura
    final Paint auraPaint = Paint()
      ..shader = const RadialGradient(
        colors: [Color(0x667C6EF6), Color(0x007C6EF6)],
      ).createShader(Rect.fromCircle(center: Offset(w * 0.5, h * 0.5), radius: w * 0.45));
    canvas.drawCircle(Offset(w * 0.5, h * 0.5), w * 0.45, auraPaint);

    // Glowing Sun ☀️
    final Paint sunPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFFFFD166), Color(0xFFFFB703)],
      ).createShader(Rect.fromCircle(center: Offset(w * 0.72, h * 0.25), radius: w * 0.15));
    canvas.drawCircle(Offset(w * 0.72, h * 0.25), w * 0.15, sunPaint);

    // Person in Meditation Body
    final Paint bodyPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0xFF7C6EF6), Color(0xFF6366F1)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, w, h));

    final Paint headPaint = Paint()..color = const Color(0xFFFED7AA);

    // Head & Hair
    canvas.drawCircle(Offset(w * 0.5, h * 0.32), w * 0.11, headPaint);
    canvas.drawCircle(Offset(w * 0.5, h * 0.22), w * 0.07, Paint()..color = const Color(0xFF334155));

    // Torso (Lotus Pose)
    final Path torsoPath = Path()
      ..moveTo(w * 0.5, h * 0.42)
      ..cubicTo(w * 0.38, h * 0.52, w * 0.28, h * 0.72, w * 0.22, h * 0.82)
      ..cubicTo(w * 0.38, h * 0.92, w * 0.62, h * 0.92, w * 0.78, h * 0.82)
      ..cubicTo(w * 0.72, h * 0.72, w * 0.62, h * 0.52, w * 0.5, h * 0.42)
      ..close();
    canvas.drawPath(torsoPath, bodyPaint);

    // Floating Leaf 🍃
    final Paint leafPaint = Paint()..color = const Color(0xFF8DD8C8);
    canvas.drawCircle(Offset(w * 0.22, h * 0.35), 8, leafPaint);
    canvas.drawCircle(Offset(w * 0.82, h * 0.65), 10, leafPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Page 2 Vector Painter: AI Mood Spectrum Lens 🔍
class _MoodSpectrumLensPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Outer Glowing Rings
    final Paint ringPaint1 = Paint()
      ..color = const Color(0xFF8DD8C8).withOpacity(0.4)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 14.0;

    final Paint ringPaint2 = Paint()
      ..color = const Color(0xFF7C6EF6).withOpacity(0.5)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 8.0;

    canvas.drawCircle(Offset(w * 0.5, h * 0.48), w * 0.32, ringPaint1);
    canvas.drawCircle(Offset(w * 0.5, h * 0.48), w * 0.22, ringPaint2);

    // Inner Glowing Spectrum Core
    final Paint corePaint = Paint()
      ..shader = const RadialGradient(
        colors: [Color(0xFFFFD166), Color(0xFF8DD8C8), Color(0xFF7C6EF6)],
      ).createShader(Rect.fromCircle(center: Offset(w * 0.5, h * 0.48), radius: w * 0.16));
    canvas.drawCircle(Offset(w * 0.5, h * 0.48), w * 0.16, corePaint);

    // Sparkle Particles
    final Paint sparklePaint = Paint()..color = const Color(0xFFFFD166);
    canvas.drawCircle(Offset(w * 0.25, h * 0.28), 6, sparklePaint);
    canvas.drawCircle(Offset(w * 0.78, h * 0.32), 8, sparklePaint);
    canvas.drawCircle(Offset(w * 0.70, h * 0.72), 5, sparklePaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

/// Page 3 Vector Painter: Safe Peer Canopy 👥
class _PeerCanopyPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    // Protective Canopy Arch
    final Paint archPaint = Paint()
      ..shader = const LinearGradient(
        colors: [Color(0x998DD8C8), Color(0x997C6EF6)],
      ).createShader(Rect.fromLTWH(0, 0, w, h))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 6.0;

    final Path archPath = Path()
      ..moveTo(w * 0.15, h * 0.85)
      ..cubicTo(w * 0.15, h * 0.25, w * 0.85, h * 0.25, w * 0.85, h * 0.85);
    canvas.drawPath(archPath, archPaint);

    // Two Silhouettes Sitting Together
    final Paint p1Paint = Paint()..color = const Color(0xFF7C6EF6);
    final Paint p2Paint = Paint()..color = const Color(0xFF8DD8C8);
    final Paint headPaint = Paint()..color = const Color(0xFFFED7AA);

    // Person 1
    canvas.drawCircle(Offset(w * 0.4, h * 0.45), w * 0.09, headPaint);
    canvas.drawOval(Rect.fromLTWH(w * 0.32, h * 0.54, w * 0.16, h * 0.3), p1Paint);

    // Person 2
    canvas.drawCircle(Offset(w * 0.6, h * 0.47), w * 0.085, headPaint);
    canvas.drawOval(Rect.fromLTWH(w * 0.52, h * 0.55, w * 0.16, h * 0.29), p2Paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
