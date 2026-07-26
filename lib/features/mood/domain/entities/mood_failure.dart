/// Base failure class for Mood domain errors
abstract class MoodFailure {
  final String message;
  const MoodFailure(this.message);
}

class MoodValidationFailure extends MoodFailure {
  const MoodValidationFailure(String message) : super(message);
}

class MoodNetworkFailure extends MoodFailure {
  const MoodNetworkFailure([String message = "No internet connection. Please check your network."])
      : super(message);
}

class MoodServerFailure extends MoodFailure {
  const MoodServerFailure([String message = "Server error processing mood check-in."])
      : super(message);
}

class MoodTimeoutFailure extends MoodFailure {
  const MoodTimeoutFailure([String message = "Request timed out. Please try again."])
      : super(message);
}

class MoodUnknownFailure extends MoodFailure {
  const MoodUnknownFailure([String message = "An unexpected error occurred."])
      : super(message);
}
