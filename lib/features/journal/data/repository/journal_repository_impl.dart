import 'dart:async';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/journal_draft_entity.dart';
import '../../domain/entities/journal_entry_entity.dart';
import '../../domain/entities/journal_failure.dart';
import '../../domain/repository/journal_repository.dart';
import '../../domain/repository/offline_journal_queue.dart';
import '../datasource/journal_local_datasource.dart';
import '../datasource/journal_remote_datasource.dart';

/// Implementation of JournalRepository ensuring strict DTO isolation and local/remote merge logic
class JournalRepositoryImpl implements JournalRepository {
  final JournalRemoteDataSource remoteDataSource;
  final JournalLocalDataSource localDataSource;
  final SecureStorageService secureStorage;
  final OfflineJournalQueue? offlineQueue;

  List<JournalEntryEntity>? _cachedEntries;

  JournalRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.secureStorage,
    this.offlineQueue,
  });

  @override
  Future<({List<JournalEntryEntity>? entries, JournalFailure? failure})> getJournals() async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          entries: null,
          failure: const JournalServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dtos = await remoteDataSource.fetchJournals(token);
        await localDataSource.cacheJournals(dtos);
        final entities = dtos.map((d) => d.toEntity()).toList();
        _cachedEntries = entities;
        return (entries: entities, failure: null);
      } catch (_) {
        // Fallback to local cache when network fails
        final cachedDtos = await localDataSource.getCachedJournals();
        if (cachedDtos.isNotEmpty) {
          final cachedEntities = cachedDtos.map((d) => d.toEntity()).toList();
          _cachedEntries = cachedEntities;
          return (entries: cachedEntities, failure: const JournalNetworkFailure());
        }
        if (_cachedEntries != null) {
          return (entries: _cachedEntries, failure: const JournalNetworkFailure());
        }
        return (entries: [], failure: const JournalNetworkFailure());
      }
    } on TimeoutException {
      return (entries: _cachedEntries, failure: const JournalTimeoutFailure());
    } catch (_) {
      return (entries: _cachedEntries, failure: const JournalNetworkFailure());
    }
  }

  @override
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> getJournalDetail(int journalId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          entry: null,
          failure: const JournalServerFailure("Unauthenticated access.")
        );
      }

      final dto = await remoteDataSource.fetchJournalDetail(token, journalId);
      final entity = dto.toEntity();
      return (entry: entity, failure: null);
    } catch (_) {
      if (_cachedEntries != null) {
        final found = _cachedEntries!.firstWhere(
          (e) => e.journalId == journalId,
          orElse: () => throw Exception('Not found'),
        );
        return (entry: found, failure: null);
      }
      return (entry: null, failure: const JournalNotFoundFailure());
    }
  }

  @override
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> createJournal({
    required String content,
    String? moodState,
  }) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          entry: null,
          failure: const JournalServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dto = await remoteDataSource.createJournal(
          accessToken: token,
          content: content,
          moodState: moodState,
        );
        final entity = dto.toEntity();
        await clearDraft();
        return (entry: entity, failure: null);
      } catch (apiError) {
        final offlineEntry = JournalEntryEntity(
          content: content,
          moodState: moodState,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        if (offlineQueue != null) {
          await offlineQueue!.enqueueSubmission(offlineEntry);
        }

        return (
          entry: null,
          failure: const JournalNetworkFailure("Network unavailable. Reflection enqueued locally.")
        );
      }
    } on TimeoutException {
      return (entry: null, failure: const JournalTimeoutFailure());
    } catch (_) {
      return (entry: null, failure: const JournalNetworkFailure());
    }
  }

  @override
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> updateJournal({
    required int journalId,
    required String content,
    String? moodState,
  }) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          entry: null,
          failure: const JournalServerFailure("Unauthenticated access.")
        );
      }

      final dto = await remoteDataSource.updateJournal(
        accessToken: token,
        journalId: journalId,
        content: content,
        moodState: moodState,
      );
      final entity = dto.toEntity();
      return (entry: entity, failure: null);
    } catch (_) {
      return (entry: null, failure: const JournalNetworkFailure());
    }
  }

  @override
  Future<({bool success, JournalFailure? failure})> deleteJournal(int journalId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          success: false,
          failure: const JournalServerFailure("Unauthenticated access.")
        );
      }

      final ok = await remoteDataSource.deleteJournal(token, journalId);
      if (ok && _cachedEntries != null) {
        _cachedEntries!.removeWhere((e) => e.journalId == journalId);
      }
      return (success: ok, failure: null);
    } catch (_) {
      return (success: false, failure: const JournalNetworkFailure());
    }
  }

  @override
  Future<void> saveDraft(JournalDraftEntity draft) {
    return localDataSource.saveDraft(draft);
  }

  @override
  Future<JournalDraftEntity?> getDraft() {
    return localDataSource.getDraft();
  }

  @override
  Future<void> clearDraft() {
    return localDataSource.clearDraft();
  }
}
