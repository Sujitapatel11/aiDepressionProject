import 'dart:async';
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE EMAIL VERIFICATION & CHECK EMAIL SCREEN
/// Features floating envelope illustration, resend countdown timer & toast.
/// ════════════════════════════════════════════════════════════════════════════

class CheckEmailScreen extends StatefulWidget {
  final String email;

  const CheckEmailScreen({
    Key? key,
    required this.email,
  }) : super(key: key);

  @override
  State<CheckEmailScreen> createState() => _CheckEmailScreenState();
}

class _CheckEmailScreenState extends State<CheckEmailScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _bounceAnimation;

  Timer? _resendTimer;
  int _countdown = 30;
  bool _canResend = false;

  @override
  void initState() {
    super.initState();

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1800),
    )..repeat(reverse: true);

    _bounceAnimation = Tween<double>(begin: -8.0, end: 8.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: Curves.easeInOutSine,
      ),
    );

    _startCountdown();
  }

  void _startCountdown() {
    setState(() {
      _countdown = 30;
      _canResend = false;
    });
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_countdown > 1) {
        setState(() => _countdown--);
      } else {
        setState(() {
          _canResend = true;
        });
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _handleResend() {
    if (!_canResend) return;

    _startCountdown();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: const [
            Icon(Icons.check_circle_outline_rounded, color: Colors.white, size: 20),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                "Reset email sent! Please check your inbox.",
                style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white),
              ),
            ),
          ],
        ),
        backgroundColor: AppTheme.mintSecondary,
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 440),
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(32),
                boxShadow: [
                  BoxShadow(
                    color: AppTheme.lavenderPrimary.withOpacity(0.06),
                    blurRadius: 36,
                    offset: const Offset(0, 12),
                  ),
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAlignment.stretch,
                children: [
                  // Animated Floating Mail Envelope
                  AnimatedBuilder(
                    animation: _bounceAnimation,
                    builder: (context, child) {
                      return Transform.translate(
                        offset: Offset(0, _bounceAnimation.value),
                        child: child,
                      );
                    },
                    child: Center(
                      child: Container(
                        width: 90,
                        height: 90,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEDE9FE),
                          borderRadius: BorderRadius.circular(28),
                        ),
                        child: const Icon(
                          Icons.mark_email_read_rounded,
                          size: 48,
                          color: AppTheme.lavenderPrimary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  Text(
                    "Check Your Email",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppTheme.textMain,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    "We've sent password reset instructions to:",
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: isDark ? Colors.white70 : AppTheme.textSub,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    widget.email,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.lavenderPrimary,
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Open Mail App Action Button
                  SizedBox(
                    height: 52,
                    child: ElevatedButton.icon(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_rounded),
                      label: const Text("Back to Login"),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.lavenderPrimary,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 18),

                  // Resend Email Button with Countdown Timer
                  SizedBox(
                    height: 52,
                    child: OutlinedButton(
                      onPressed: _canResend ? _handleResend : null,
                      style: OutlinedButton.styleFrom(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(20),
                        ),
                      ),
                      child: Text(
                        _canResend
                            ? "Resend Email"
                            : "Resend Email in ${_countdown}s",
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
