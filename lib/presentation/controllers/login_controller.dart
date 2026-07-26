import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../../core/network/failure.dart';
import '../../domain/repositories/auth_repository.dart';

class LoginController extends ChangeNotifier {
  final AuthRepository repository;
  final GoogleSignIn _googleSignIn;

  LoginController({
    required this.repository,
    GoogleSignIn? googleSignIn,
  }) : _googleSignIn = googleSignIn ?? GoogleSignIn(scopes: ['email', 'profile']);

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isPasswordVisible = false;
  bool get isPasswordVisible => _isPasswordVisible;

  String? _emailError;
  String? get emailError => _emailError;

  String? _passwordError;
  String? get passwordError => _passwordError;

  void togglePasswordVisibility() {
    _isPasswordVisible = !_isPasswordVisible;
    notifyListeners();
  }

  /// Field Validation Rules (Inline errors under fields)
  bool validateInputs(String email, String password) {
    bool isValid = true;
    _emailError = null;
    _passwordError = null;

    // Email validation
    final String trimmedEmail = email.trim();
    if (trimmedEmail.isEmpty) {
      _emailError = "Email is required";
      isValid = false;
    } else if (!RegExp(r"^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$").hasMatch(trimmedEmail)) {
      _emailError = "Please enter a valid email address";
      isValid = false;
    }

    // Password validation
    if (password.isEmpty) {
      _passwordError = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      _passwordError = "Password must be at least 6 characters";
      isValid = false;
    }

    notifyListeners();
    return isValid;
  }

  /// Main Login Business Logic Flow
  Future<bool> login({
    required String email,
    required String password,
    required Function(String snackbarMessage) onErrorSnackBar,
  }) async {
    if (_isLoading) return false; // Prevent duplicate requests

    if (!validateInputs(email, password)) {
      return false; // Inline field errors displayed
    }

    _isLoading = true;
    notifyListeners();

    final result = await repository.login(
      usernameOrEmail: email.trim(),
      password: password,
    );

    _isLoading = false;
    notifyListeners();

    if (result.failure != null) {
      final Failure failure = result.failure!;
      onErrorSnackBar(failure.message);
      return false;
    }

    return true; // Success: navigate to dashboard
  }

  /// Google OAuth Sign In Flow
  Future<bool> continueWithGoogle({
    required Function(String snackbarMessage) onErrorSnackBar,
  }) async {
    if (_isLoading) return false;

    _isLoading = true;
    notifyListeners();

    try {
      final GoogleSignInAccount? googleUser = await _googleSignIn.signIn();
      if (googleUser == null) {
        _isLoading = false;
        notifyListeners();
        return false; // User cancelled flow
      }

      final GoogleSignInAuthentication googleAuth = await googleUser.authentication;
      final String? idToken = googleAuth.idToken;

      if (idToken == null) {
        _isLoading = false;
        notifyListeners();
        onErrorSnackBar("Could not retrieve Google ID Token");
        return false;
      }

      // Send ID Token to Django backend for verification & JWT issuance
      final result = await repository.authenticateWithGoogle(idToken: idToken);

      _isLoading = false;
      notifyListeners();

      if (result.failure != null) {
        onErrorSnackBar(result.failure!.message);
        return false;
      }

      return true; // Success: navigate to dashboard
    } catch (e) {
      _isLoading = false;
      notifyListeners();
  /// Main Signup Business Logic Flow
  Future<bool> signup({
    required String username,
    required String email,
    required String password,
    required Function(String snackbarMessage) onErrorSnackBar,
  }) async {
    if (_isLoading) return false;

    if (!validateInputs(email, password)) {
      return false;
    }

    _isLoading = true;
    notifyListeners();

    final result = await repository.signup(
      username: username.trim().isEmpty ? email.split('@')[0] : username.trim(),
      email: email.trim(),
      password: password,
    );

    _isLoading = false;
    notifyListeners();

    if (result.failure != null) {
      onErrorSnackBar(result.failure!.message);
      return false;
    }

    return true;
  }
}

