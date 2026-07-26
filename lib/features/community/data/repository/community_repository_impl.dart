import 'dart:async';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/community_failure.dart';
import '../../domain/entities/peer_user_entity.dart';
import '../../domain/entities/support_connection_entity.dart';
import '../../domain/entities/support_request_entity.dart';
import '../../domain/repository/community_repository.dart';
import '../../domain/repository/offline_community_queue.dart';
import '../datasource/community_local_datasource.dart';
import '../datasource/community_remote_datasource.dart';

/// Implementation of CommunityRepository ensuring strict DTO isolation and local/remote merge logic
class CommunityRepositoryImpl implements CommunityRepository {
  final CommunityRemoteDataSource remoteDataSource;
  final CommunityLocalDataSource localDataSource;
  final SecureStorageService secureStorage;
  final OfflineCommunityQueue? offlineQueue;

  CommunityRepositoryImpl({
    required this.remoteDataSource,
    required this.localDataSource,
    required this.secureStorage,
    this.offlineQueue,
  });

  @override
  Future<({List<PeerUserEntity>? candidates, CommunityFailure? failure})> getPeerSuggestions({String mode = 'smart'}) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          candidates: null,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dtos = await remoteDataSource.fetchPeerSuggestions(token, mode: mode);
        await localDataSource.cachePeerSuggestions(dtos);
        final entities = dtos.map((d) => d.toEntity()).toList();
        return (candidates: entities, failure: null);
      } catch (_) {
        final cachedDtos = await localDataSource.getCachedPeerSuggestions();
        if (cachedDtos.isNotEmpty) {
          final cachedEntities = cachedDtos.map((d) => d.toEntity()).toList();
          return (candidates: cachedEntities, failure: const CommunityNetworkFailure());
        }
        return (candidates: [], failure: const CommunityNetworkFailure());
      }
    } on TimeoutException {
      return (candidates: null, failure: const CommunityTimeoutFailure());
    } catch (_) {
      return (candidates: null, failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({List<SupportConnectionEntity>? connections, CommunityFailure? failure})> getActiveConnections() async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          connections: null,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dtos = await remoteDataSource.fetchActiveConnections(token);
        await localDataSource.cacheActiveConnections(dtos);
        final entities = dtos.map((d) => d.toEntity()).toList();
        return (connections: entities, failure: null);
      } catch (_) {
        final cachedDtos = await localDataSource.getCachedActiveConnections();
        if (cachedDtos.isNotEmpty) {
          final cachedEntities = cachedDtos.map((d) => d.toEntity()).toList();
          return (connections: cachedEntities, failure: const CommunityNetworkFailure());
        }
        return (connections: [], failure: const CommunityNetworkFailure());
      }
    } catch (_) {
      return (connections: null, failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({List<SupportRequestEntity>? requests, CommunityFailure? failure})> getIncomingRequests() async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          requests: null,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      final dtos = await remoteDataSource.fetchIncomingRequests(token);
      final entities = dtos.map((d) => d.toEntity()).toList();
      return (requests: entities, failure: null);
    } catch (_) {
      return (requests: [], failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({SupportRequestEntity? request, CommunityFailure? failure})> sendSupportRequest(int userId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          request: null,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      try {
        final dto = await remoteDataSource.sendSupportRequest(token, userId);
        return (request: dto.toEntity(), failure: null);
      } catch (apiError) {
        if (offlineQueue != null) {
          await offlineQueue!.enqueueRequest(userId);
        }
        return (
          request: null,
          failure: const CommunityNetworkFailure("Network unavailable. Request queued offline.")
        );
      }
    } on TimeoutException {
      return (request: null, failure: const CommunityTimeoutFailure());
    } catch (_) {
      return (request: null, failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({SupportConnectionEntity? connection, CommunityFailure? failure})> acceptRequest(int requestId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          connection: null,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      final dto = await remoteDataSource.acceptRequest(token, requestId);
      return (connection: dto.toEntity(), failure: null);
    } catch (_) {
      return (connection: null, failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({bool success, CommunityFailure? failure})> rejectRequest(int requestId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          success: false,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      final ok = await remoteDataSource.rejectRequest(token, requestId);
      return (success: ok, failure: null);
    } catch (_) {
      return (success: false, failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({bool success, CommunityFailure? failure})> blockConnection(String connectionId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          success: false,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      final ok = await remoteDataSource.blockConnection(token, connectionId);
      return (success: ok, failure: null);
    } catch (_) {
      return (success: false, failure: const CommunityNetworkFailure());
    }
  }

  @override
  Future<({bool success, CommunityFailure? failure})> disconnectConnection(String connectionId) async {
    try {
      final token = await secureStorage.getAccessToken();
      if (token == null || token.isEmpty) {
        return (
          success: false,
          failure: const CommunityServerFailure("Unauthenticated access.")
        );
      }

      final ok = await remoteDataSource.disconnectConnection(token, connectionId);
      return (success: ok, failure: null);
    } catch (_) {
      return (success: false, failure: const CommunityNetworkFailure());
    }
  }
}
