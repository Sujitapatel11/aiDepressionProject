import 'dart:async';
import '../../../../core/storage/secure_storage_service.dart';
import '../../../authentication/domain/repository/auth_repository.dart';

import '../../domain/entities/personality_profile_entity.dart';
import '../../domain/entities/profile_failure.dart';
import '../../domain/entities/user_profile_entity.dart';
import '../../domain/repository/offline_profile_queue.dart';
import '../../domain/repository/profile_repository.dart';

import '../datasource/profile_local_datasource.dart';
import '../datasource/profile_remote_datasource.dart';
import '../dto/user_profile_dto.dart';

/// Implementation of ProfileRepository ensuring strict DTO isolation and local/remote merge logic
class ProfileRepositoryImpl implements ProfileRepository {
  final ProfileRemoteDataSource remoteDataSource;
  final ProfileLocalDataSource localDataSource;
  final SecureStorageService secureStorage;
  final AuthRepository authRepository;
  final OfflineProfileQueue? offlineQueue;

  ProfileRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.secureStorage,
    required this.authRepository,
    this.offlineQueue,
  });

  @override
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> getUserProfile() async {
    try {
      final username = await secureStorage.read(key: 'KEY_USERNAME') ?? 'SoulCare Member';
      final email = await secureStorage.read(key: 'KEY_EMAIL') ?? 'user@soulcare.app';

      final dto = UserProfileDto(
        id: 1,
        username: username,
        email: email,
        displayName: username,
      );

      await localDataSource.cacheUserProfile(dto);
      return (profile: dto.toEntity(), failure: null);
    } catch (_) {
      final cached = await localDataSource.getCachedUserProfile();
      if (cached != null) {
        return (profile: cached.toEntity(), failure: const ProfileNetworkFailure());
      }
      return (profile: null, failure: const ProfileNetworkFailure());
    }
  }

  @override
  Future<({PersonalityProfileEntity? personality, ProfileFailure? failure})> getPersonalityProfile() async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          personality: null,
          failure: const ProfileServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dto = await remoteDataSource.fetchPersonalityProfile(token);
        await localDataSource.cachePersonalityProfile(dto);
        return (personality: dto.toEntity(), failure: null);
      } catch (_) {
        final cached = await localDataSource.getCachedPersonalityProfile();
        if (cached != null) {
          return (personality: cached.toEntity(), failure: const ProfileNetworkFailure());
        }
        return (
          personality: const PersonalityProfileEntity(hasData: false),
          failure: const ProfileNetworkFailure()
        );
      }
    } on TimeoutException {
      return (personality: null, failure: const ProfileTimeoutFailure());
    } catch (_) {
      return (personality: null, failure: const ProfileNetworkFailure());
    }
  }

  @override
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> updateDisplayName(String displayName) async {
    try {
      final current = await getUserProfile();
      if (current.profile != null) {
        final updated = current.profile!.copyWith(displayName: displayName);
        await secureStorage.write(key: 'KEY_USERNAME', value: displayName);
        await localDataSource.cacheUserProfile(UserProfileDto(
          id: updated.id,
          username: updated.username,
          email: updated.email,
          displayName: updated.displayName,
        ));
        return (profile: updated, failure: null);
      }
      return (profile: null, failure: const ProfileServerFailure("Unable to update profile."));
    } catch (_) {
      if (offlineQueue != null) {
        await offlineQueue!.enqueueUpdate(displayName);
      }
      return (profile: null, failure: const ProfileNetworkFailure("Network unavailable. Update queued offline."));
    }
  }

  @override
  Future<void> logout() async {
    final refreshToken = await secureStorage.read(key: 'KEY_REFRESH_TOKEN');
    if (refreshToken != null && refreshToken.isNotEmpty) {
      try {
        await authRepository.logout(refreshToken: refreshToken);
      } catch (_) {
        // Silently clear storage even if network logout fails
      }
    }
    await secureStorage.deleteAll();
  }
}
