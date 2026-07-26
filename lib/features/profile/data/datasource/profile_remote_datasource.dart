import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../dto/personality_profile_dto.dart';

/// Remote HTTP Data Source for Profile & Personality REST endpoints (/api/support/personality/)
class ProfileRemoteDataSource {
  final AppConfig config;
  final http.Client client;

  ProfileRemoteDataSource({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  /// GET /api/support/personality/
  Future<PersonalityProfileDto> fetchPersonalityProfile(String accessToken) async {
    final url = Uri.parse('${config.baseUrl}/api/support/personality/');
    final response = await client.get(
      url,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer $accessToken',
      },
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return PersonalityProfileDto.fromJson(json);
    } else {
      throw Exception("Failed to fetch personality traits.");
    }
  }
}
