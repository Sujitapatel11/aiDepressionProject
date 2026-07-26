import 'dart:convert';
import '../../../../core/storage/secure_storage_service.dart';
import '../dto/personality_profile_dto.dart';
import '../dto/user_profile_dto.dart';

/// Local Data Source handling offline Profile & Personality caching
class ProfileLocalDataSource {
  final SecureStorageService secureStorage;

  static const String _keyCachedUserProfile = 'KEY_CACHED_USER_PROFILE';
  static const String _keyCachedPersonality = 'KEY_CACHED_PERSONALITY';

  ProfileLocalDataSource({required this.secureStorage});

  /// Caches user profile locally
  Future<void> cacheUserProfile(UserProfileDto profile) async {
    await secureStorage.write(
      key: _keyCachedUserProfile,
      value: jsonEncode(profile.toJson()),
    );
  }

  /// Retrieves cached user profile
  Future<UserProfileDto?> getCachedUserProfile() async {
    final rawJson = await secureStorage.read(key: _keyCachedUserProfile);
    if (rawJson == null || rawJson.isEmpty) return null;

    try {
      final json = jsonDecode(rawJson) as Map<String, dynamic>;
      return UserProfileDto.fromJson(json);
    } catch (_) {
      return null;
    }
  }

  /// Caches personality traits locally
  Future<void> cachePersonalityProfile(PersonalityProfileDto personality) async {
    await secureStorage.write(
      key: _keyCachedPersonality,
      value: jsonEncode(personality.toJson()),
    );
  }

  /// Retrieves cached personality traits
  Future<PersonalityProfileDto?> getCachedPersonalityProfile() async {
    final rawJson = await secureStorage.read(key: _keyCachedPersonality);
    if (rawJson == null || rawJson.isEmpty) return null;

    try {
      final json = jsonDecode(rawJson) as Map<String, dynamic>;
      return PersonalityProfileDto.fromJson(json);
    } catch (_) {
      return null;
    }
  }
}
