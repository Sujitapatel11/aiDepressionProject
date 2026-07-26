import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../dto/journal_entry_dto.dart';

/// Remote HTTP Data Source for Journal REST endpoints (/api/journal/)
class JournalRemoteDataSource {
  final AppConfig config;
  final http.Client client;

  JournalRemoteDataSource({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  /// GET /api/journal/
  Future<List<JournalEntryDto>> fetchJournals(String accessToken) async {
    final url = Uri.parse('${config.baseUrl}/api/journal/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final list = jsonDecode(response.body) as List;
      return list.map((item) => JournalEntryDto.fromJson(item as Map<String, dynamic>)).toList();
    } else {
      throw Exception("Failed to fetch journal reflections.");
    }
  }

  /// GET /api/journal/<journal_id>/
  Future<JournalEntryDto> fetchJournalDetail(String accessToken, int journalId) async {
    final url = Uri.parse('${config.baseUrl}/api/journal/$journalId/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return JournalEntryDto.fromJson(json);
    } else {
      throw Exception("Failed to fetch journal reflection detail.");
    }
  }

  /// POST /api/journal/
  Future<JournalEntryDto> createJournal({
    required String accessToken,
    required String content,
    String? moodState,
  }) async {
    final url = Uri.parse('${config.baseUrl}/api/journal/');
    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'content': content,
        if (moodState != null) 'mood': moodState,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return JournalEntryDto.fromJson(json);
    } else {
      throw Exception("Failed to create journal reflection.");
    }
  }

  /// PATCH /api/journal/<journal_id>/
  Future<JournalEntryDto> updateJournal({
    required String accessToken,
    required int journalId,
    required String content,
    String? moodState,
  }) async {
    final url = Uri.parse('${config.baseUrl}/api/journal/$journalId/');
    final response = await client.patch(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'content': content,
        if (moodState != null) 'mood': moodState,
      }),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return JournalEntryDto.fromJson(json);
    } else {
      throw Exception("Failed to update journal reflection.");
    }
  }

  /// DELETE /api/journal/<journal_id>/ (Soft-delete)
  Future<bool> deleteJournal(String accessToken, int journalId) async {
    final url = Uri.parse('${config.baseUrl}/api/journal/$journalId/');
    final response = await client.delete(
      url,
      headers: {
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 204 || response.statusCode == 200) {
      return true;
    } else {
      throw Exception("Failed to delete journal reflection.");
    }
  }
}
