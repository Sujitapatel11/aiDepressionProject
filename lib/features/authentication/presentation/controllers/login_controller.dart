import 'package:flutter/material.dart';
import '../../data/services/google_auth_service.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/repository/auth_repository.dart';
import '../../domain/usecases/login_usecase.dart';
import '../state/login_state.dart';
import 'session_manager.dart';

/// Presentation Controller handling Login form validation, Google OAuth, API submission, and state updates
class LoginController extends ChangeNotifier {
  final LoginUseCase loginUseCase;
  final AuthRepository repository;
  final SessionManager sessionManager;

  LoginState _state = const LoginState();
  LoginState get state => _state;

  LoginController({
    required this.loginUseCase,
    required this.repository,
    required this.sessionManager,
  });

  void togglePasswordVisibility() {
    _state = _state.copyWith(isPasswordVisible: !_state.isPasswordVisible);
    notifyListeners();
  }

  bool _validateInput({required String email, required String password}) {
    String? emailError;
    String? passwordError;

    final trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty) {
      emailError = "Please enter your email.";
    } else if (!trimmedEmail.contains('@') || !trimmedEmail.contains('.')) {
      emailError = "Please enter a valid email address.";
    }

    if (password.isEmpty) {
      passwordError = "Please enter your password.";
    }

    if (emailError != null || passwordError != null) {
      _state = _state.copyWith(
        emailError: emailError,
        passwordError: passwordError,
        generalError: null,
      );
      notifyListeners();
      return false;
    }

    _state = _state.copyWith(clearErrors: true);
    notifyListeners();
    return true;
  }

  Future<bool> login({
    required String email,
    required String password,
  }) async {
    if (!_validateInput(email: email, password: password)) {
      return false;
    }

    _state = _state.copyWith(isLoading: true, clearErrors: true);
    notifyListeners();

    final result = await loginUseCase.execute(
      username: email.trim(),
      password: password,
    );

    if (result.failure != null) {
      final failure = result.failure!;
      String friendlyMessage;

      if (failure is InvalidCredentialsFailure) {
        friendlyMessage = "We couldn't sign you in. Please check your credentials.";
      } else if (failure is NetworkFailure) {
        friendlyMessage = "No internet connection.";
      } else {
        friendlyMessage = "Something went wrong. Please try again.";
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

  Future<bool> continueWithGoogle(GoogleAuthService googleAuthService) async {
    _state = _state.copyWith(isLoading: true, clearErrors: true);
    notifyListeners();

    final idToken = await googleAuthService.getGoogleIdToken();
    if (idToken == null) {
      // User cancelled Google Sign-In picker
      _state = _state.copyWith(isLoading: false);
      notifyListeners();
      return false;
    }

    final result = await repository.continueWithGoogle(idToken: idToken);

    if (result.failure != null) {
      final failure = result.failure!;
      String friendlyMessage;

      if (failure is NetworkFailure) {
        friendlyMessage = "No internet connection.";
      } else {
        friendlyMessage = "Google authentication failed. Please try again.";
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
