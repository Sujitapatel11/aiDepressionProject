/// Domain Failure Abstraction for Error Handling
abstract class Failure {
  final String message;
  final int? statusCode;

  const Failure(this.message, {this.statusCode});
}

class NetworkFailure extends Failure {
  const NetworkFailure([String message = "No internet connection"])
      : super(message);
}

class InvalidCredentialsFailure extends Failure {
  const InvalidCredentialsFailure([String message = "Invalid email or password"])
      : super(message, statusCode: 401);
}

class ServerFailure extends Failure {
  const ServerFailure([String message = "Server unavailable. Please try again later."])
      : super(message, statusCode: 500);
}

class RateLimitFailure extends Failure {
  const RateLimitFailure([String message = "Too many attempts. Please wait a moment."])
      : super(message, statusCode: 429);
}

class TimeoutFailure extends Failure {
  const TimeoutFailure([String message = "Connection timed out. Please try again."])
      : super(message);
}

class UnknownFailure extends Failure {
  const UnknownFailure([String message = "An unexpected error occurred."])
      : super(message);
}
