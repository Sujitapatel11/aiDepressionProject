/// Base failure class for Community domain errors
abstract class CommunityFailure {
  final String message;
  const CommunityFailure(this.message);
}

class CommunityNetworkFailure extends CommunityFailure {
  const CommunityNetworkFailure([String message = "No internet connection. Please check your network."])
      : super(message);
}

class CommunityServerFailure extends CommunityFailure {
  const CommunityServerFailure([String message = "Server error processing community support request."])
      : super(message);
}

class CommunityTimeoutFailure extends CommunityFailure {
  const CommunityTimeoutFailure([String message = "Community request timed out. Please try again."])
      : super(message);
}
