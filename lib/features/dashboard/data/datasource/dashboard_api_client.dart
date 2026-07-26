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
    final url = Uri.parse('${config.baseUrl}/api/journal/entries/'); // Real backend endpoint
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      return DashboardSummaryDto(
        userId: 1,
        username: "User",
        streak: 3,
        mood: "Calm",
        sentiment: 0.45,
        unreadCount: 0,
      );
    } else {
      throw Exception("Failed to load dashboard summary");
    }
  }
}
