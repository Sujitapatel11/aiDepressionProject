import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../dto/insight_dto.dart';

/// Remote HTTP Data Source for AI Insights REST endpoints (/api/insights/)
class InsightsRemoteDataSource {
  final AppConfig config;
  final http.Client client;

  InsightsRemoteDataSource({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  /// GET /api/insights/
  Future<List<InsightDto>> fetchInsights(String accessToken) async {
    final url = Uri.parse('${config.baseUrl}/api/insights/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((item) => InsightDto.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception("Failed to fetch AI insights.");
    }
  }

  /// POST /api/insights/dismiss/<insight_id>/
  Future<bool> dismissInsight(String accessToken, int insightId) async {
    final url = Uri.parse('${config.baseUrl}/api/insights/dismiss/$insightId/');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      throw Exception("Failed to dismiss AI insight.");
    }
  }

  /// POST /api/insights/generate/<journal_id>/
  Future<InsightDto> generateForJournal(String accessToken, int journalId) async {
    final url = Uri.parse('${config.baseUrl}/api/insights/generate/$journalId/');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return InsightDto.fromJson(json);
    } else {
      throw Exception("Failed to generate AI insight.");
    }
  }
}
