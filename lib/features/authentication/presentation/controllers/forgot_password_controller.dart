import 'package:flutter/material.dart';
import '../../domain/repository/auth_repository.dart';
import '../state/forgot_password_state.dart';

/// Controller handling Password Reset email validation and neutral submission feedback
class ForgotPasswordController extends ChangeNotifier {
  final AuthRepository repository;

  ForgotPasswordState _state = const ForgotPasswordState();
  ForgotPasswordState get state => _state;

  ForgotPasswordController({required this.repository});

  bool _validateEmail(String email) {
    final trimmed = email.trim();
    if (trimmed.isEmpty) {
      _state = _state.copyWith(
        emailError: "Please enter your email.",
        generalError: null,
      );
      notifyListeners();
      return false;
    } else if (!trimmed.contains('@') || !trimmed.contains('.')) {
      _state = _state.copyWith(
        emailError: "Please enter a valid email address.",
        generalError: null,
      );
      notifyListeners();
      return false;
    }

    _state = _state.copyWith(clearErrors: true);
    notifyListeners();
    return true;
  }

  Future<void> sendPasswordReset(String email) async {
    if (!_validateEmail(email)) return;

    _state = _state.copyWith(isLoading: true, clearErrors: true);
    notifyListeners();

    try {
      await repository.requestPasswordReset(email.trim());
      _state = _state.copyWith(
        isLoading: false,
        isSubmitted: true,
      );
    } catch (_) {
      // Return neutral success state to prevent account enumeration attacks
      _state = _state.copyWith(
        isLoading: false,
        isSubmitted: true,
      );
    }
    notifyListeners();
  }
}
