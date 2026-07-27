import 'package:flutter/foundation.dart';
import '../observability/telemetry_service.dart';
import 'app_config.dart';

/// Production Closed Beta observability hooks for logging, crash reporting, and analytics
abstract class AppObservabilityHooks {
  static TelemetryService? _telemetryService;

  /// Initializes telemetry service with app configuration
  static void initialize(AppConfig config) {
    _telemetryService = TelemetryService(config: config);
  }

  /// Reports non-fatal and fatal application exceptions
  static void recordError(dynamic exception, StackTrace? stackTrace, {String? reason, bool fatal = false}) {
    if (kDebugMode) {
      debugPrint('[OBSERVABILITY_ERROR] $reason: $exception');
      if (stackTrace != null) debugPrint(stackTrace.toString());
    }
    
    _telemetryService?.reportCrash(
      stackTrace: "${reason ?? 'Exception'}: $exception\n${stackTrace?.toString() ?? ''}",
      severity: fatal ? 'fatal' : 'non_fatal',
    );
  }

  /// Records privacy-safe analytics user interactions (DAU, feature events, screen views)
  static void logEvent(String eventName, {Map<String, dynamic>? parameters}) {
    if (kDebugMode) {
      debugPrint('[OBSERVABILITY_EVENT] $eventName: $parameters');
    }
    
    _telemetryService?.logEvent(
      eventName,
      metadata: parameters,
    );
  }
}
