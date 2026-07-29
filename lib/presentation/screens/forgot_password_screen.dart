import 'package:flutter/material.dart';
import '../../domain/repositories/auth_repository.dart';
import 'check_email_screen.dart';

class ForgotPasswordScreen extends StatefulWidget {
  final AuthRepository repository;
  final String initialEmail;

  const ForgotPasswordScreen({
    Key? key,
    required this.repository,
    this.initialEmail = "",
  }) : super(key: key);

  @override
  State<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends State<ForgotPasswordScreen> {
  late final TextEditingController _emailController;
  bool _isLoading = false;
  String? _emailError;

  static const Color _lavenderPrimary = Color(0xFF6750A4);
  static const Color _textMain = Color(0xFF1D1B20);
  static const Color _textSub = Color(0xFF49454F);

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: widget.initialEmail);
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _onSendResetLink() async {
    final String email = _emailController.text.trim();
    if (email.isEmpty || !RegExp(r"^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$").hasMatch(email)) {
      setState(() => _emailError = "Please enter a valid email address");
      return;
    }

    setState(() {
      _emailError = null;
      _isLoading = true;
    });

    final failure = await widget.repository.requestPasswordReset(email: email);

    if (mounted) {
      setState(() => _isLoading = false);

      if (failure != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(failure.message),
            backgroundColor: const Color(0xFFB3261E),
          ),
        );
      } else {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (_) => CheckEmailScreen(email: email),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _textMain),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
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
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.lock_reset_rounded,
                  size: 56,
                  color: _lavenderPrimary,
                ),
                const SizedBox(height: 16),
                const Text(
                  "Forgot Password?",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: _textMain,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  "Enter your registered email address and we will send you instructions to reset your password.",
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 14,
                    color: _textSub,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 24),
                TextField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  enabled: !_isLoading,
                  decoration: InputDecoration(
                    hintText: "name@example.com",
                    errorText: _emailError,
                    prefixIcon: const Icon(Icons.mail_outline_rounded),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  height: 52,
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _onSendResetLink,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _lavenderPrimary,
                      foregroundColor: Colors.white,
                      shape: const StadiumBorder(),
                    ),
                    child: _isLoading
                        ? const SizedBox(
                            width: 22,
                            height: 22,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : const Text(
                            "Send Reset Instructions",
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