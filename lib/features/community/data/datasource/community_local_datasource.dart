import 'dart:convert';
import '../../../../core/storage/secure_storage_service.dart';
import '../dto/peer_user_dto.dart';
import '../dto/support_connection_dto.dart';

/// Local Data Source handling offline Community & Peer Support caching
class CommunityLocalDataSource {
  final SecureStorageService secureStorage;

  static const String _keyCachedPeers = 'KEY_CACHED_PEERS';
  static const String _keyCachedConnections = 'KEY_CACHED_CONNECTIONS';

  CommunityLocalDataSource({required this.secureStorage});

  /// Caches peer candidates locally
  Future<void> cachePeerSuggestions(List<PeerUserDto> entries) async {
    final listJson = entries.map((e) => e.toJson()).toList();
    await secureStorage.write(
      key: _keyCachedPeers,
      value: jsonEncode(listJson),
    );
  }

  /// Retrieves cached peer candidates
  Future<List<PeerUserDto>> getCachedPeerSuggestions() async {
    final rawJson = await secureStorage.read(key: _keyCachedPeers);
    if (rawJson == null || rawJson.isEmpty) return [];

    try {
      final list = jsonDecode(rawJson) as List;
      return list.map((item) => PeerUserDto.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }

  /// Caches active connections locally
  Future<void> cacheActiveConnections(List<SupportConnectionDto> entries) async {
    final listJson = entries.map((e) => e.toJson()).toList();
    await secureStorage.write(
      key: _keyCachedConnections,
      value: jsonEncode(listJson),
    );
  }

  /// Retrieves cached active connections
  Future<List<SupportConnectionDto>> getCachedActiveConnections() async {
    final rawJson = await secureStorage.read(key: _keyCachedConnections);
    if (rawJson == null || rawJson.isEmpty) return [];

    try {
      final list = jsonDecode(rawJson) as List;
      return list.map((item) => SupportConnectionDto.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}
