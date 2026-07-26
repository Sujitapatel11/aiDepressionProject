import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../dto/mood_entry_dto.dart';

/// Remote HTTP Data Source for Mood Check-In REST operations
class MoodRemoteDataSource {
  final AppConfig config;
  final http.Client client;

  MoodRemoteDataSource({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  /// Submits new mood check-in or updates today's entry
  Future<MoodEntryDto> postMoodCheckIn({
    required String accessToken,
    required String moodState,
    String? note,
  }) async {
    final url = Uri.parse('${config.baseUrl}/api/journal/');
    final bodyContent = note != null && note.isNotEmpty
        ? "Mood Check-In: $moodState - $note"
        : "Mood Check-In: $moodState";

    final response = await client.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
      body: jsonEncode({
        'content': bodyContent,
        'mood': moodState,
      }),
    );

    if (response.statusCode == 201 || response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      json['mood'] = moodState;
      return MoodEntryDto.fromJson(json);
    } else {
      throw Exception("Failed to save mood check-in.");
    }
  }

  /// Fetches recent entries to extract today's mood check-in
  Future<MoodEntryDto?> fetchTodaysMood(String accessToken) async {
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
      if (list.isNotEmpty) {
        final firstMap = list.first as Map<String, dynamic>;
        return MoodEntryDto.fromJson(firstMap);
      }
      return null;
    } else {
      throw Exception("Failed to fetch today's mood check-in.");
    }
  }
}
