import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/app_config.dart';
import '../../core/network/failure.dart';
import '../models/insight_model.dart';

class InsightsRemoteDataSource {
  final http.Client client;
  final AppConfig config;

  InsightsRemoteDataSource({http.Client? client, this.config = AppConfig.dev})
      : client = client ?? http.Client();

  Future<List<InsightModel>> fetchInsights(String token) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/insights/");
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
        return data.map((e) => InsightModel.fromJson(e)).toList();
      } else {
        throw const ServerFailure();
      }
    } on SocketException {
      throw const NetworkFailure();
    } catch (e) {
      if (e is Failure) rethrow;
      throw UnknownFailure(e.toString());
    }
  }

  Future<void> dismissInsight(String token, int insightId) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/insights/dismiss/$insightId/");
    try {
      await client.post(
        url,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      ).timeout(config.apiTimeout);
    } catch (_) {}
  }
}
