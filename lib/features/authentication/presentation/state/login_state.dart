/// Immutable State representation for Login Feature
class LoginState {
  final bool isLoading;
  final bool isPasswordVisible;
  final String? emailError;
  final String? passwordError;
  final String? generalError;
  final bool isSuccess;

  const LoginState({
    this.isLoading = false,
    this.isPasswordVisible = false,
    this.emailError,
    this.passwordError,
    this.generalError,
    this.isSuccess = false,
  });

  LoginState copyWith({
    bool? isLoading,
    bool? isPasswordVisible,
    String? emailError,
    String? passwordError,
    String? generalError,
    bool? isSuccess,
    bool clearErrors = false,
  }) {
    return LoginState(
      isLoading: isLoading ?? this.isLoading,
      isPasswordVisible: isPasswordVisible ?? this.isPasswordVisible,
      emailError: clearErrors ? null : (emailError ?? this.emailError),
      passwordError: clearErrors ? null : (passwordError ?? this.passwordError),
      generalError: clearErrors ? null : (generalError ?? this.generalError),
      isSuccess: isSuccess ?? this.isSuccess,
    );
  }
}
