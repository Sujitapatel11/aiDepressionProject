/// Base failure class for Journal domain errors
abstract class JournalFailure {
  final String message;
  const JournalFailure(this.message);
}

class JournalValidationFailure extends JournalFailure {
  const JournalValidationFailure(String message) : super(message);
}

class JournalNetworkFailure extends JournalFailure {
  const JournalNetworkFailure([String message = "No internet connection. Please check your network."])
      : super(message);
}

class JournalServerFailure extends JournalFailure {
  const JournalServerFailure([String message = "Server error processing journal reflection."])
      : super(message);
}

class JournalTimeoutFailure extends JournalFailure {
  const JournalTimeoutFailure([String message = "Journal request timed out. Please try again."])
      : super(message);
}

class JournalNotFoundFailure extends JournalFailure {
  const JournalNotFoundFailure([String message = "Journal reflection not found."])
      : super(message);
}
