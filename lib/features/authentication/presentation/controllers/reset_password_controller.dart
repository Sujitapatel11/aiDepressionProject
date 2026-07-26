import 'package:flutter/material.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/repository/auth_repository.dart';
import '../state/reset_password_state.dart';

/// Controller handling Password Reset confirmation validation & execution
class ResetPasswordController extends ChangeNotifier {
  final AuthRepository repository;
  final String uid;
  final String token;

  ResetPasswordState _state = const ResetPasswordState();
  ResetPasswordState get state => _state;

  ResetPasswordController({
    required this.repository,
    required this.uid,
    required this.token,
  });

  void togglePasswordVisibility() {
    _state = _state.copyWith(isPasswordVisible: !_state.isPasswordVisible);
    notifyListeners();
  }

  void toggleConfirmPasswordVisibility() {
    _state = _state.copyWith(
        isConfirmPasswordVisible: !_state.isConfirmPasswordVisible);
    notifyListeners();
  }

  double calculatePasswordStrength(String password) {
    if (password.isEmpty) return 0.0;
    double strength = 0.0;
    if (password.length >= 6) strength += 0.35;
    if (password.contains(RegExp(r'[A-Z]')) || password.contains(RegExp(r'[0-9]'))) {
      strength += 0.35;
    }
    if (password.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'))) {
      strength += 0.30;
    }
    return strength.clamp(0.0, 1.0);
  }

  bool _validateInput({
    required String newPassword,
    required String confirmPassword,
  }) {
    String? passwordError;
    String? confirmPasswordError;

    if (newPassword.isEmpty) {
      passwordError = "Please enter a new password.";
    } else if (newPassword.length < 6) {
      passwordError = "Password must be at least 6 characters.";
    }

    if (confirmPassword.isEmpty) {
      confirmPasswordError = "Please confirm your password.";
    } else if (confirmPassword != newPassword) {
      confirmPasswordError = "Passwords do not match.";
    }

    if (passwordError != null || confirmPasswordError != null) {
      _state = _state.copyWith(
        passwordError: passwordError,
        confirmPasswordError: confirmPasswordError,
        generalError: null,
      );
      notifyListeners();
      return false;
    }

    _state = _state.copyWith(clearErrors: true);
    notifyListeners();
    return true;
  }

  Future<bool> resetPassword({
    required String newPassword,
    required String confirmPassword,
  }) async {
    if (uid.isEmpty || token.isEmpty) {
      _state = _state.copyWith(
        generalError: "Invalid or expired reset link. Please request a new link.",
      );
      notifyListeners();
      return false;
    }

    if (!_validateInput(
      newPassword: newPassword,
      confirmPassword: confirmPassword,
    )) {
      return false;
    }

    _state = _state.copyWith(isLoading: true, clearErrors: true);
    notifyListeners();

    final result = await repository.confirmPasswordReset(
      uid: uid,
      token: token,
      newPassword: newPassword,
      reNewPassword: confirmPassword,
    );

    if (result.failure != null) {
      final failure = result.failure!;
      String friendlyMessage;

      if (failure is TokenExpiredFailure) {
        friendlyMessage = failure.message;
      } else if (failure is NetworkFailure) {
        friendlyMessage = "No internet connection.";
      } else {
        friendlyMessage = "Failed to reset password. Please try again.";
      }

      _state = _state.copyWith(
        isLoading: false,
        generalError: friendlyMessage,
      );
      notifyListeners();
      return false;
    }

    _state = _state.copyWith(isLoading: false, isSuccess: true);
    notifyListeners();
    return true;
  }
}
