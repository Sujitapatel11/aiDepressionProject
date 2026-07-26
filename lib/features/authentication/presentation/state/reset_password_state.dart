/// Immutable State representation for Reset Password Confirm Feature
class ResetPasswordState {
  final bool isLoading;
  final bool isPasswordVisible;
  final bool isConfirmPasswordVisible;
  final String? passwordError;
  final String? confirmPasswordError;
  final String? generalError;
  final bool isSuccess;

  const ResetPasswordState({
    this.isLoading = false,
    this.isPasswordVisible = false,
    this.isConfirmPasswordVisible = false,
    this.passwordError,
    this.confirmPasswordError,
    this.generalError,
    this.isSuccess = false,
  });

  ResetPasswordState copyWith({
    bool? isLoading,
    bool? isPasswordVisible,
    bool? isConfirmPasswordVisible,
    String? passwordError,
    String? confirmPasswordError,
    String? generalError,
    bool? isSuccess,
    bool clearErrors = false,
  }) {
    return ResetPasswordState(
      isLoading: isLoading ?? this.isLoading,
      isPasswordVisible: isPasswordVisible ?? this.isPasswordVisible,
      isConfirmPasswordVisible:
          isConfirmPasswordVisible ?? this.isConfirmPasswordVisible,
      passwordError: clearErrors ? null : (passwordError ?? this.passwordError),
      confirmPasswordError:
          clearErrors ? null : (confirmPasswordError ?? this.confirmPasswordError),
      generalError: clearErrors ? null : (generalError ?? this.generalError),
      isSuccess: isSuccess ?? this.isSuccess,
    );
  }
}
