/// Abstract domain failure model for Dashboard operations
abstract class DashboardFailure {
  final String message;
  const DashboardFailure(this.message);
}

class DashboardNetworkFailure extends DashboardFailure {
  const DashboardNetworkFailure([String message = "No internet connection."])
      : super(message);
}

class DashboardServerFailure extends DashboardFailure {
  const DashboardServerFailure([String message = "Unable to load dashboard data."])
      : super(message);
}
