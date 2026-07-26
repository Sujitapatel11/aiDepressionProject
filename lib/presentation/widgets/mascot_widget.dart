import 'package:flutter/material.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULIE THE CLOUD (Original Calming & Friendly Mascot for SoulCare)
/// Features floating physics, gentle breathing, soft gradients, and expressive eyes.
/// ════════════════════════════════════════════════════════════════════════════

enum MascotMood { happy, idle, excited, supportive }

class SoulCareMascot extends StatefulWidget {
  final double size;
  final MascotMood mood;

  const SoulCareMascot({
    Key? key,
    this.size = 120,
    this.mood = MascotMood.idle,
  }) : super(key: key);

  @override
  State<SoulCareMascot> createState() => _SoulCareMascotState();
}

class _SoulCareMascotState extends State<SoulCareMascot>
    with SingleTickerProviderStateMixin {
  late AnimationController _floatController;
  late Animation<double> _floatAnimation;
  late Animation<double> _scaleAnimation;

  @override
  void initState() {
    super.initState();
    _floatController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 2400),
    )..repeat(reverse: true);

    _floatAnimation = Tween<double>(begin: -6.0, end: 6.0).animate(
      CurvedAnimation(
        parent: _floatController,
        curve: Curves.easeInOutSine,
      ),
    );

    _scaleAnimation = Tween<double>(begin: 0.98, end: 1.02).animate(
      CurvedAnimation(
        parent: _floatController,
        curve: Curves.easeInOutSine,
      ),
    );
  }

  @override
  void dispose() {
    _floatController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final double s = widget.size;

    return AnimatedBuilder(
      animation: _floatController,
      builder: (context, child) {
        return Transform.translate(
          offset: Offset(0, _floatAnimation.value),
          child: Transform.scale(
            scale: _scaleAnimation.value,
            child: SizedBox(
              width: s,
              height: s * 0.9,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Calming Back Glow
                  Container(
                    width: s * 0.75,
                    height: s * 0.55,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(s),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF7C6EF6).withOpacity(0.28),
                          blurRadius: s * 0.3,
                          spreadRadius: 4,
                        ),
                        BoxShadow(
                          color: const Color(0xFF8DD8C8).withOpacity(0.3),
                          blurRadius: s * 0.35,
                          spreadRadius: -2,
                        ),
                      ],
                    ),
                  ),

                  // Mascot Cloud Body (Soft Pill Shapes)
                  CustomPaint(
                    size: Size(s, s * 0.85),
                    painter: _SouliePainter(),
                  ),

                  // Sparkle Star Accessory Above Head
                  Positioned(
                    top: 2,
                    right: s * 0.22,
                    child: Container(
                      padding: const EdgeInsets.all(4),
                      decoration: const BoxDecoration(
                        color: Color(0xFFFFD166),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.auto_awesome_rounded,
                        size: 14,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),

                  // Expressive Eyes & Smile
                  Positioned(
                    top: s * 0.35,
                    child: Row(
                      mainAxisAlignment: MainState.center,
                      children: [
                        // Left Eye
                        _buildEye(s),
                        SizedBox(width: s * 0.22),
                        // Right Eye
                        _buildEye(s),
                      ],
                    ),
                  ),

                  // Blushing Cheeks
                  Positioned(
                    top: s * 0.44,
                    child: Row(
                      mainAxisAlignment: MainState.center,
                      children: [
                        _buildBlush(s),
                        SizedBox(width: s * 0.38),
                        _buildBlush(s),
                      ],
                    ),
                  ),

                  // Gentle Happy Smile
                  Positioned(
                    top: s * 0.46,
                    child: Container(
                      width: s * 0.16,
                      height: s * 0.08,
                      decoration: BoxDecoration(
                        border: Border(
                          bottom: BorderSide(
                            color: const Color(0xFF1E293B),
                            width: s * 0.025,
                          ),
                        ),
                        borderRadius: BorderRadius.circular(s * 0.08),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEye(double s) {
    return Container(
      width: s * 0.09,
      height: s * 0.11,
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(s * 0.06),
      ),
      child: Align(
        alignment: Alignment.topRight,
        child: Container(
          margin: const EdgeInsets.all(1.5),
          width: s * 0.035,
          height: s * 0.035,
          decoration: const BoxDecoration(
            color: Colors.white,
            shape: BoxShape.circle,
          ),
        ),
      ),
    );
  }

  Widget _buildBlush(double s) {
    return Container(
      width: s * 0.12,
      height: s * 0.06,
      decoration: BoxDecoration(
        color: const Color(0xFFFF8A8A).withOpacity(0.55),
        borderRadius: BorderRadius.circular(s * 0.06),
      ),
    );
  }
}

/// Vector Painter for Soulie's Cloud Body
class _SouliePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final double w = size.width;
    final double h = size.height;

    final Paint fillPaint = Paint()
      ..shader = const LinearGradient(
        colors: [
          Color(0xFFFFFFFF),
          Color(0xFFF1F5F9),
          Color(0xFFE2E8F0),
        ],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, w, h));

    final Paint borderPaint = Paint()
      ..color = const Color(0xFF7C6EF6).withOpacity(0.18)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    final Path path = Path();
    // Center base bubble
    path.addRRect(RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.12, h * 0.35, w * 0.76, h * 0.52),
      Radius.circular(w * 0.3),
    ));

    // Left bubble
    path.addOval(Rect.fromLTWH(w * 0.08, h * 0.28, w * 0.42, h * 0.48));
    // Right bubble
    path.addOval(Rect.fromLTWH(w * 0.50, h * 0.30, w * 0.40, h * 0.46));
    // Top center bubble
    path.addOval(Rect.fromLTWH(w * 0.26, h * 0.14, w * 0.48, h * 0.55));

    canvas.drawPath(path, fillPaint);
    canvas.drawPath(path, borderPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
