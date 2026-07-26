import 'dart:async';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/mood_entry_entity.dart';
import '../../domain/entities/mood_failure.dart';
import '../../domain/repository/mood_repository.dart';
import '../../domain/repository/offline_submission_queue.dart';
import '../datasource/mood_remote_datasource.dart';

/// Implementation of MoodRepository ensuring DTO isolation and domain entity mapping
class MoodRepositoryImpl implements MoodRepository {
  final MoodRemoteDataSource remoteDataSource;
  final SecureStorageService secureStorage;
  final OfflineSubmissionQueue? offlineQueue;

  MoodEntryEntity? _cachedTodaysEntry;

  MoodRepositoryImpl({
    required this.remoteDataSource,
    required this.secureStorage,
    this.offlineQueue,
  });

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> getTodaysMood() async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          entry: null,
          failure: const MoodServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dto = await remoteDataSource.fetchTodaysMood(token);
        if (dto != null) {
          _cachedTodaysEntry = dto.toEntity();
          return (entry: _cachedTodaysEntry, failure: null);
        }
        return (entry: _cachedTodaysEntry, failure: null);
      } catch (_) {
        if (_cachedTodaysEntry != null) {
          return (entry: _cachedTodaysEntry, failure: null);
        }
        return (entry: null, failure: null);
      }
    } on TimeoutException {
      return (entry: _cachedTodaysEntry, failure: const MoodTimeoutFailure());
    } catch (_) {
      return (entry: _cachedTodaysEntry, failure: const MoodNetworkFailure());
    }
  }

  @override
  Future<({MoodEntryEntity? entry, MoodFailure? failure})> submitMoodCheckIn({
    required String moodState,
    String? note,
  }) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          entry: null,
          failure: const MoodServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dto = await remoteDataSource.postMoodCheckIn(
          accessToken: token,
          moodState: moodState,
          note: note,
        );
        final entry = dto.toEntity();
        _cachedTodaysEntry = entry;
        return (entry: entry, failure: null);
      } catch (apiError) {
        final offlineEntry = MoodEntryEntity(
          moodState: moodState,
          note: note,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );
        _cachedTodaysEntry = offlineEntry;

        if (offlineQueue != null) {
          await offlineQueue!.enqueueSubmission(offlineEntry);
        }

        return (
          entry: null,
          failure: const MoodNetworkFailure("Network unavailable. Mood check-in enqueued locally.")
        );
      }
    } on TimeoutException {
      return (entry: null, failure: const MoodTimeoutFailure());
    } catch (_) {
      return (entry: null, failure: const MoodNetworkFailure());
    }
  }
}
