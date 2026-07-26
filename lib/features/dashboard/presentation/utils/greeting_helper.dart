import 'package:intl/intl.dart';

/// Pure utility helper for calculating time-of-day greetings and date formatting
abstract class GreetingHelper {
  /// Computes greeting based on local time
  /// - 05:00 to 11:59: "Good Morning"
  /// - 12:00 to 16:59: "Good Afternoon"
  /// - 17:00 to 04:59: "Good Evening"
  static String getGreeting([DateTime? time]) {
    final now = time ?? DateTime.now();
    final hour = now.hour;
    if (hour >= 5 && hour < 12) {
      return "Good Morning";
    } else if (hour >= 12 && hour < 17) {
      return "Good Afternoon";
    } else {
      return "Good Evening";
    }
  }

  /// Formats date for display (e.g. "Sunday, Jul 26")
  static String getFormattedDate([DateTime? time]) {
    final now = time ?? DateTime.now();
    return DateFormat('EEEE, MMM d').format(now);
  }
}
