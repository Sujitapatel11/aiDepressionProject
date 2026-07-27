import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';

/// Telemetry and Observability Service for Closed Beta Tracking
/// Handles crash reporting, analytics events, client error logging, and in-app feedback.
class TelemetryService {
  final AppConfig config;
  final http.Client client;

  TelemetryService({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  String get _baseUrl => config.apiBaseUrl;

  /// Submits non-fatal & fatal crash stack traces to /api/telemetry/crash/
  Future<bool> reportCrash({
    required String stackTrace,
    String severity = 'fatal',
    Map<String, dynamic>? deviceInfo,
    String? osVersion,
    String? appVersion,
  }) async {
    try {
      final Uri uri = Uri.parse("$_baseUrl/api/telemetry/crash/");
      final response = await client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "stack_trace": stackTrace,
          "severity": severity,
          "device_info": deviceInfo ?? {
            "platform": kIsWeb ? "Web" : Platform.operatingSystem,
            "is_debug": kDebugMode,
          },
          "os_version": osVersion ?? (kIsWeb ? "Browser" : Platform.operatingSystemVersion),
          "app_version": appVersion ?? "1.0.0+beta",
        }),
      );
      return response.statusCode == 201;
    } catch (e) {
      if (kDebugMode) debugPrint('[TELEMETRY_ERROR] Crash report dispatch failed: $e');
      return false;
    }
  }

  /// Dispatches privacy-safe analytics interaction event to /api/telemetry/event/
  Future<bool> logEvent(
    String eventName, {
    String? sessionId,
    double durationSeconds = 0.0,
    Map<String, dynamic>? metadata,
  }) async {
    try {
      final Uri uri = Uri.parse("$_baseUrl/api/telemetry/event/");
      final response = await client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "event_name": eventName,
          "session_id": sessionId ?? "",
          "duration_seconds": durationSeconds,
          "metadata": metadata ?? {},
        }),
      );
      return response.statusCode == 201;
    } catch (e) {
      if (kDebugMode) debugPrint('[TELEMETRY_ERROR] Event dispatch failed: $e');
      return false;
    }
  }

  /// Submits client error and performance logs to /api/telemetry/log/
  Future<bool> logClientMessage({
    required String message,
    String level = 'info',
    String module = 'app',
    String stackTrace = '',
  }) async {
    try {
      final Uri uri = Uri.parse("$_baseUrl/api/telemetry/log/");
      final response = await client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "message": message,
          "level": level,
          "module": module,
          "stack_trace": stackTrace,
        }),
      );
      return response.statusCode == 201;
    } catch (e) {
      return false;
    }
  }

  /// Submits in-app feedback (bug reports, feature requests) to /api/feedback/
  Future<bool> submitFeedback({
    required String category,
    required String title,
    required String description,
    Map<String, dynamic>? deviceInfo,
    String? screenshotBase64,
  }) async {
    try {
      final Uri uri = Uri.parse("$_baseUrl/api/feedback/");
      final response = await client.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          "category": category,
          "title": title,
          "description": description,
          "device_info": deviceInfo ?? {
            "platform": kIsWeb ? "Web" : Platform.operatingSystem,
          },
          "app_version": "1.0.0+beta",
          "screenshot_base64": screenshotBase64 ?? "",
        }),
      );
      return response.statusCode == 201;
    } catch (e) {
      if (kDebugMode) debugPrint('[TELEMETRY_ERROR] Feedback submission failed: $e');
      return false;
    }
  }
}
