import '../../domain/entities/auth_failure.dart';

/// Immutable State representation for Signup Feature
class SignupState {
  final bool isLoading;
  final bool isPasswordVisible;
  final bool isConfirmPasswordVisible;
  final String? nameError;
  final String? emailError;
  final String? passwordError;
  final String? confirmPasswordError;
  final String? generalError;
  final bool isSuccess;

  const SignupState({
    this.isLoading = false,
    this.isPasswordVisible = false,
    this.isConfirmPasswordVisible = false,
    this.nameError,
    this.emailError,
    this.passwordError,
    this.confirmPasswordError,
    this.generalError,
    this.isSuccess = false,
  });

  SignupState copyWith({
    bool? isLoading,
    bool? isPasswordVisible,
    bool? isConfirmPasswordVisible,
    String? nameError,
    String? emailError,
    String? passwordError,
    String? confirmPasswordError,
    String? generalError,
    bool? isSuccess,
    bool clearErrors = false,
  }) {
    return SignupState(
      isLoading: isLoading ?? this.isLoading,
      isPasswordVisible: isPasswordVisible ?? this.isPasswordVisible,
      isConfirmPasswordVisible:
          isConfirmPasswordVisible ?? this.isConfirmPasswordVisible,
      nameError: clearErrors ? null : (nameError ?? this.nameError),
      emailError: clearErrors ? null : (emailError ?? this.emailError),
      passwordError: clearErrors ? null : (passwordError ?? this.passwordError),
      confirmPasswordError:
          clearErrors ? null : (confirmPasswordError ?? this.confirmPasswordError),
      generalError: clearErrors ? null : (generalError ?? this.generalError),
      isSuccess: isSuccess ?? this.isSuccess,
    );
  }
}
