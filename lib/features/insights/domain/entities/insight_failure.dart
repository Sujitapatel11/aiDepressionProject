/// Base failure class for AI Insights domain errors
abstract class InsightFailure {
  final String message;
  const InsightFailure(this.message);
}

class InsightNetworkFailure extends InsightFailure {
  const InsightNetworkFailure([String message = "No internet connection. Please check your network."])
      : super(message);
}

class InsightServerFailure extends InsightFailure {
  const InsightServerFailure([String message = "Server error fetching AI insights."])
      : super(message);
}

class InsightTimeoutFailure extends InsightFailure {
  const InsightTimeoutFailure([String message = "Request timed out. Please try again."])
      : super(message);
}

class InsightNotFoundFailure extends InsightFailure {
  const InsightNotFoundFailure([String message = "Insight not found."])
      : super(message);
}
