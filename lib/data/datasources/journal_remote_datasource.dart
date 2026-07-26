import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/app_config.dart';
import '../../core/network/failure.dart';
import '../models/journal_model.dart';

class JournalRemoteDataSource {
  final http.Client client;
  final AppConfig config;

  JournalRemoteDataSource({http.Client? client, this.config = AppConfig.dev})
      : client = client ?? http.Client();

  Future<List<JournalModel>> fetchJournals(String token) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/journal/");
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
        return data.map((e) => JournalModel.fromJson(e)).toList();
      } else if (response.statusCode == 401) {
        throw const InvalidCredentialsFailure("Session expired. Please log in again.");
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

  Future<JournalModel> createJournal({
    required String token,
    required String title,
    required String content,
    required String mood,
    required int moodIntensity,
    required List<String> tags,
  }) async {
    final url = Uri.parse("${config.apiBaseUrl}/api/journal/");
    try {
      final response = await client.post(
        url,
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode({
          "title": title,
          "content": content,
          "mood": mood,
          "mood_intensity": moodIntensity,
          "tags": tags,
        }),
      ).timeout(config.apiTimeout);

      if (response.statusCode == 201 || response.statusCode == 200) {
        return JournalModel.fromJson(jsonDecode(response.body));
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
}
