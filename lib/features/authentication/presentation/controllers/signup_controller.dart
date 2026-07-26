import 'package:flutter/material.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/repository/auth_repository.dart';
import '../controllers/session_manager.dart';
import '../state/signup_state.dart';

/// Presentation Controller handling Signup form validation, strength calculations, and API submission
class SignupController extends ChangeNotifier {
  final AuthRepository repository;
  final SessionManager sessionManager;

  SignupState _state = const SignupState();
  SignupState get state => _state;

  SignupController({
    required this.repository,
    required this.sessionManager,
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
    required String name,
    required String email,
    required String password,
    required String confirmPassword,
  }) {
    String? nameError;
    String? emailError;
    String? passwordError;
    String? confirmPasswordError;

    final trimmedName = name.trim();
    if (trimmedName.isEmpty) {
      nameError = "Please enter your name.";
    }

    final trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty) {
      emailError = "Please enter your email.";
    } else if (!trimmedEmail.contains('@') || !trimmedEmail.contains('.')) {
      emailError = "Please enter a valid email address.";
    }

    if (password.isEmpty) {
      passwordError = "Please enter a password.";
    } else if (password.length < 6) {
      passwordError = "Password must be at least 6 characters.";
    }

    if (confirmPassword.isEmpty) {
      confirmPasswordError = "Please confirm your password.";
    } else if (confirmPassword != password) {
      confirmPasswordError = "Passwords do not match.";
    }

    if (nameError != null ||
        emailError != null ||
        passwordError != null ||
        confirmPasswordError != null) {
      _state = _state.copyWith(
        nameError: nameError,
        emailError: emailError,
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

  Future<bool> signup({
    required String name,
    required String email,
    required String password,
    required String confirmPassword,
  }) async {
    if (!_validateInput(
      name: name,
      email: email,
      password: password,
      confirmPassword: confirmPassword,
    )) {
      return false;
    }

    _state = _state.copyWith(isLoading: true, clearErrors: true);
    notifyListeners();

    final result = await repository.signup(
      username: name.trim(),
      email: email.trim(),
      password: password,
      passwordConfirm: confirmPassword,
    );

    if (result.failure != null) {
      final failure = result.failure!;
      String friendlyMessage;

      if (failure is InvalidCredentialsFailure) {
        friendlyMessage = failure.message;
      } else if (failure is NetworkFailure) {
        friendlyMessage = "No internet connection.";
      } else {
        friendlyMessage = "Registration failed. Please try again.";
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

    await sessionManager.checkSession();
    return true;
  }
}
