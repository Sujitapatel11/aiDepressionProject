import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/app_config.dart';
import '../../core/network/failure.dart';
import '../models/connection_model.dart';

import '../../core/network/ssl_pinning_client.dart';

class SupportRemoteDataSource {
  final http.Client client;
  final AppConfig config;

  SupportRemoteDataSource({http.Client? client, this.config = AppConfig.dev})
      : client = client ?? SslPinningClient.createClient(config);

  Future<List<ConnectionModel>> fetchActiveConnections(String token) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/support/connections/");
    try {
      final response = await client.get(
        url,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      ).timeout(config.apiTimeout);

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return data.map((e) => ConnectionModel.fromJson(e)).toList();
      } else {
        return [];
      }
    } on SocketException {
      throw const NetworkFailure();
    } catch (_) {
      return [];
    }
  }

  Future<List<ConnectionModel>> fetchAvailableUsers(String token) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/support/users/");
    try {
      final response = await client.get(
        url,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      ).timeout(config.apiTimeout);

      if (response.statusCode == 200) {
        final List data = jsonDecode(response.body);
        return data.map((e) => ConnectionModel.fromJson(e)).toList();
      } else {
        return [];
      }
    } catch (_) {
      return [];
    }
  }

  Future<void> sendSupportRequest(String token, int userId) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/support/send/$userId/");
    await client.post(
      url,
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );
  }
}
