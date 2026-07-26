import 'package:flutter/foundation.dart';

/// Release readiness observability hooks for logging, crash reporting, and privacy-preserving analytics
abstract class AppObservabilityHooks {
  /// Reports non-fatal application exceptions
  static void recordError(dynamic exception, StackTrace? stackTrace, {String? reason}) {
    if (kDebugMode) {
      debugPrint('[OBSERVABILITY_ERROR] $reason: $exception');
      if (stackTrace != null) debugPrint(stackTrace.toString());
    } else {
      // Release mode hook: Dispatch to crash reporting service (e.g. Firebase Crashlytics / Sentry)
    }
  }

  /// Records privacy-safe analytics user interactions
  static void logEvent(String eventName, {Map<String, dynamic>? parameters}) {
    if (kDebugMode) {
      debugPrint('[OBSERVABILITY_EVENT] $eventName: $parameters');
    } else {
      // Release mode hook: Dispatch to privacy-compliant analytics service
    }
  }
}
