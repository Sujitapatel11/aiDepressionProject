/// Abstract domain failure model for authentication errors
abstract class AuthFailure {
  final String message;
  const AuthFailure(this.message);
}

class InvalidCredentialsFailure extends AuthFailure {
  const InvalidCredentialsFailure([String message = "Invalid email/username or password."])
      : super(message);
}

class TokenExpiredFailure extends AuthFailure {
  const TokenExpiredFailure([String message = "Session expired. Please log in again."])
      : super(message);
}

class NetworkFailure extends AuthFailure {
  const NetworkFailure([String message = "Unable to connect to SoulCare server."])
      : super(message);
}

class UnknownAuthFailure extends AuthFailure {
  const UnknownAuthFailure([String message = "An unexpected error occurred."])
      : super(message);
}
