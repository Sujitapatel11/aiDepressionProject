/// Base failure class for Profile domain errors
abstract class ProfileFailure {
  final String message;
  const ProfileFailure(this.message);
}

class ProfileNetworkFailure extends ProfileFailure {
  const ProfileNetworkFailure([String message = "No internet connection. Please check your network."])
      : super(message);
}

class ProfileServerFailure extends ProfileFailure {
  const ProfileServerFailure([String message = "Server error fetching user profile."])
      : super(message);
}

class ProfileTimeoutFailure extends ProfileFailure {
  const ProfileTimeoutFailure([String message = "Profile request timed out. Please try again."])
      : super(message);
}
