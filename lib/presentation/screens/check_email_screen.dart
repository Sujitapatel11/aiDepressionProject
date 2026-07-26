import 'package:flutter/material.dart';

class CheckEmailScreen extends StatelessWidget {
  final String email;

  const CheckEmailScreen({
    Key? key,
    required this.email,
  }) : super(key: key);

  static const Color _lavenderPrimary = Color(0xFF6750A4);
  static const Color _textMain = Color(0xFF1D1B20);
  static const Color _textSub = Color(0xFF49454F);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Container(
            constraints: const BoxConstraints(maxWidth: 420),
            padding: const EdgeInsets.all(28),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: _lavenderPrimary.withOpacity(0.08),
                  blurRadius: 36,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAlignment.stretch,
              children: [
                Container(
                  width: 72,
                  height: 72,
                  margin: const EdgeInsets.only(bottom: 20),
                  decoration: const BoxDecoration(
                    color: Color(0xFFE8F5E9),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.mark_email_read_rounded,
                    size: 40,
                    color: Color(0xFF2D6A4F),
                  ),
                ),
                const Text(
                  "Check Your Email",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    color: _textMain,
                  ),
                ),
                const SizedBox(height: 12),
                RichText(
                  textAlign: TextAlign.center,
                  text: TextSpan(
                    style: const TextStyle(
                      fontSize: 14,
                      color: _textSub,
                      height: 1.4,
                    ),
                    children: [
                      const TextSpan(text: "We have sent password reset instructions to "),
                      TextSpan(
                        text: email,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          color: _textMain,
                        ),
                      ),
                      const TextSpan(text: " if an account exists."),
                    ],
                  ),
                ),
                const SizedBox(height: 28),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.of(context).popUntil((route) => route.isFirst);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _lavenderPrimary,
                      foregroundColor: Colors.white,
                      shape: const StadiumBorder(),
                    ),
                    child: const Text(
                      "Back to Login",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
