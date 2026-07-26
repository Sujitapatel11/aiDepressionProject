import '../../domain/entities/dashboard_failure.dart';

/// Pure utility mapping domain failures into friendly UI strings
class DashboardErrorMapper {
  static String mapFailureToMessage(DashboardFailure? failure) {
    if (failure == null) return "An unexpected error occurred.";
    if (failure is DashboardNetworkFailure) {
      return "No internet connection. Please check your network.";
    } else if (failure is DashboardServerFailure) {
      return failure.message;
    }
    return "Something went wrong. Please try again.";
  }
}
