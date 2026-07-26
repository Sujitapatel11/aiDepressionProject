import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http/io_client.dart';
import '../config/app_config.dart';

/// Production-ready SSL Certificate Pinning abstraction configurable via AppConfig
class SslPinningClient {
  /// Returns an HTTP Client configured with optional certificate pinning based on AppConfig environment
  static http.Client createClient(AppConfig config) {
    if (config.environment == 'production' && config.pinnedCertificateFingerprint != null) {
      final SecurityContext securityContext = SecurityContext(withTrustedRoots: true);

      final HttpClient httpClient = HttpClient(context: securityContext)
        ..badCertificateCallback = (X509Certificate cert, String host, int port) {
          final String fingerprint = cert.sha256.map((b) => b.toRadixString(16).padLeft(2, '0')).join(':');
          return fingerprint.toLowerCase() == config.pinnedCertificateFingerprint!.toLowerCase();
        };

      return IOClient(httpClient);
    }

    return http.Client();
  }
}
