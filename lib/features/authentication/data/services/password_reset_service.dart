/// Abstract service interface for Password Reset workflows
abstract class PasswordResetService {
  /// Request password reset email link from backend
  Future<bool> requestPasswordReset(String email);
}
