import 'dart:math';
import 'package:flutter/material.dart';
import '../../core/config/app_config.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../core/theme/app_theme.dart';
import 'login_screen.dart';
import 'shell_screen.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE SPLASH SCREEN WITH FLOATING PARTICLES & GENTLE LOGO FADE
/// ════════════════════════════════════════════════════════════════════════════

class SplashScreen extends StatefulWidget {
  final AppConfig config;

  const SplashScreen({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _fadeAnimation;

  late AnimationController _particleController;
  final List<_Particle> _particles = [];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();

    // Generate floating background particles
    for (int i = 0; i < 22; i++) {
      _particles.add(
        _Particle(
          x: _random.nextDouble(),
          y: _random.nextDouble(),
          radius: _random.nextDouble() * 4 + 2,
          speed: _random.nextDouble() * 0.0006 + 0.0002,
          opacity: _random.nextDouble() * 0.4 + 0.2,
          color: i % 2 == 0 ? AppTheme.lavenderPrimary : AppTheme.mintSecondary,
        ),
      );
    }

    _particleController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 50),
    )..addListener(() {
        setState(() {
          for (var p in _particles) {
            p.y -= p.speed;
            if (p.y < 0) {
              p.y = 1.0;
              p.x = _random.nextDouble();
            }
          }
        });
      });
    _particleController.repeat();

    _logoController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _scaleAnimation = Tween<double>(begin: 0.85, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: Curves.easeOutBack,
      ),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _logoController,
      curve: Curves.easeIn,
    );

    _logoController.forward();

    // Auto-navigate after splash delay
    Future.delayed(const Duration(milliseconds: 2200), _checkAuthAndNavigate);
  }

  @override
  void dispose() {
    _logoController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  Future<void> _checkAuthAndNavigate() async {
    final storage = SecureStorageService();
    final token = await storage.getAccessToken();

    if (!mounted) return;

    if (token != null && token.isNotEmpty) {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 700),
          pageBuilder: (_, __, ___) => SoulCareShellScreen(config: widget.config),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    } else {
      Navigator.of(context).pushReplacement(
        PageRouteBuilder(
          transitionDuration: const Duration(milliseconds: 700),
          pageBuilder: (_, __, ___) => SoulCareLoginScreen(config: widget.config),
          transitionsBuilder: (_, animation, __, child) =>
              FadeTransition(opacity: animation, child: child),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Soft Calming Gradient Background
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0xFFF8FAFC),
                  Color(0xFFF1F5F9),
                  Color(0xFFEDE9FE),
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
              ),
            ),
          ),

          // Floating Background Particles Canvas
          CustomPaint(
            size: Size.infinite,
            painter: _ParticlePainter(_particles),
          ),

          // Glowing Accent Orbs
          Positioned(
            top: -50,
            left: -40,
            child: Container(
              width: 260,
              height: 260,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.lavenderPrimary.withOpacity(0.12),
              ),
            ),
          ),
          Positioned(
            bottom: -60,
            right: -40,
            child: Container(
              width: 280,
              height: 280,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: AppTheme.mintSecondary.withOpacity(0.18),
              ),
            ),
          ),

          // Center Logo & Tagline
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: FadeTransition(
                opacity: _fadeAnimation,
                child: ScaleTransition(
                  scale: _scaleAnimation,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Animated Brand Icon
                      Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [
                              AppTheme.lavenderPrimary,
                              Color(0xFF9333EA),
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(30),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.lavenderPrimary.withOpacity(0.35),
                              blurRadius: 28,
                              offset: const Offset(0, 10),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.spa_rounded,
                          size: 52,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 24),

                      // App Name
                      const Text(
                        "SoulCare",
                        style: TextStyle(
                          fontSize: 36,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textMain,
                          letterSpacing: -0.8,
                        ),
                      ),
                      const SizedBox(height: 12),

                      // Tagline
                      Text(
                        "Understand yourself.\nConnect with people who truly understand.",
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: 15,
                          color: AppTheme.textSub,
                          height: 1.5,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Particle {
  double x;
  double y;
  double radius;
  double speed;
  double opacity;
  Color color;

  _Particle({
    required this.x,
    required this.y,
    required this.radius,
    required this.speed,
    required this.opacity,
    required this.color,
  });
}

class _ParticlePainter extends CustomPainter {
  final List<_Particle> particles;

  _ParticlePainter(this.particles);

  @override
  void paint(Canvas canvas, Size size) {
    for (var p in particles) {
      final paint = Paint()
        ..color = p.color.withOpacity(p.opacity)
        ..style = PaintingStyle.fill;
      canvas.drawCircle(
        Offset(p.x * size.width, p.y * size.height),
        p.radius,
        paint,
      );
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
