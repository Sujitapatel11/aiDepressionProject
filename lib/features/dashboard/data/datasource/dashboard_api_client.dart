import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../dto/dashboard_summary_dto.dart';

/// Data Source Client for Dashboard endpoints
class DashboardApiClient {
  final AppConfig config;
  final http.Client client;

  DashboardApiClient({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  Future<DashboardSummaryDto> fetchSummary(String accessToken) async {
    final url = Uri.parse('${config.baseUrl}/api/dashboard/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      return DashboardSummaryDto.fromJson(data);
    } else {
      throw Exception("Failed to load dashboard summary");
    }
  }
}
