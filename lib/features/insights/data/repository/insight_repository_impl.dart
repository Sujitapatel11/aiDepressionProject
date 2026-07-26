import 'dart:async';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/insight_entity.dart';
import '../../domain/entities/insight_failure.dart';
import '../../domain/repository/insight_repository.dart';
import '../../domain/repository/offline_insight_queue.dart';
import '../datasource/insights_local_datasource.dart';
import '../datasource/insights_remote_datasource.dart';

/// Implementation of InsightRepository ensuring strict DTO isolation and local/remote merge logic
class InsightRepositoryImpl implements InsightRepository {
  final InsightsRemoteDataSource remoteDataSource;
  final InsightsLocalDataSource localDataSource;
  final SecureStorageService secureStorage;
  final OfflineInsightQueue? offlineQueue;

  List<InsightEntity>? _cachedInsights;

  InsightRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.secureStorage,
    this.offlineQueue,
  });

  @override
  Future<({List<InsightEntity>? insights, InsightFailure? failure})> getInsights() async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          insights: null,
          failure: const InsightServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dtos = await remoteDataSource.fetchInsights(token);
        await localDataSource.cacheInsights(dtos);
        final entities = dtos.map((d) => d.toEntity()).toList();
        _cachedInsights = entities;
        return (insights: entities, failure: null);
      } catch (_) {
        final cachedDtos = await localDataSource.getCachedInsights();
        if (cachedDtos.isNotEmpty) {
          final cachedEntities = cachedDtos.map((d) => d.toEntity()).toList();
          _cachedInsights = cachedEntities;
          return (insights: cachedEntities, failure: const InsightNetworkFailure());
        }
        if (_cachedInsights != null) {
          return (insights: _cachedInsights, failure: const InsightNetworkFailure());
        }
        return (insights: [], failure: const InsightNetworkFailure());
      }
    } on TimeoutException {
      return (insights: _cachedInsights, failure: const InsightTimeoutFailure());
    } catch (_) {
      return (insights: _cachedInsights, failure: const InsightNetworkFailure());
    }
  }

  @override
  Future<({bool success, InsightFailure? failure})> dismissInsight(int insightId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          success: false,
          failure: const InsightServerFailure("Unauthenticated access.")
        );
      }

      try {
        final ok = await remoteDataSource.dismissInsight(token, insightId);
        if (ok && _cachedInsights != null) {
          _cachedInsights!.removeWhere((i) => i.insightId == insightId);
        }
        return (success: ok, failure: null);
      } catch (apiError) {
        if (offlineQueue != null) {
          await offlineQueue!.enqueueDismissal(insightId);
        }
        if (_cachedInsights != null) {
          _cachedInsights!.removeWhere((i) => i.insightId == insightId);
        }
        return (
          success: true,
          failure: const InsightNetworkFailure("Network unavailable. Dismissal enqueued locally.")
        );
      }
    } on TimeoutException {
      return (success: false, failure: const InsightTimeoutFailure());
    } catch (_) {
      return (success: false, failure: const InsightNetworkFailure());
    }
  }

  @override
  Future<({InsightEntity? insight, InsightFailure? failure})> generateForJournal(int journalId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          insight: null,
          failure: const InsightServerFailure("Unauthenticated access.")
        );
      }

      final dto = await remoteDataSource.generateForJournal(token, journalId);
      final entity = dto.toEntity();
      return (insight: entity, failure: null);
    } catch (_) {
      return (insight: null, failure: const InsightNetworkFailure());
    }
  }
}
