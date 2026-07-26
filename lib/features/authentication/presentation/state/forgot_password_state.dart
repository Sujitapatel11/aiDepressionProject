/// Immutable State representation for Forgot Password Feature
class ForgotPasswordState {
  final bool isLoading;
  final String? emailError;
  final String? generalError;
  final bool isSubmitted;

  const ForgotPasswordState({
    this.isLoading = false,
    this.emailError,
    this.generalError,
    this.isSubmitted = false,
  });

  ForgotPasswordState copyWith({
    bool? isLoading,
    String? emailError,
    String? generalError,
    bool? isSubmitted,
    bool clearErrors = false,
  }) {
    return ForgotPasswordState(
      isLoading: isLoading ?? this.isLoading,
      emailError: clearErrors ? null : (emailError ?? this.emailError),
      generalError: clearErrors ? null : (generalError ?? this.generalError),
      isSubmitted: isSubmitted ?? this.isSubmitted,
    );
  }
}
