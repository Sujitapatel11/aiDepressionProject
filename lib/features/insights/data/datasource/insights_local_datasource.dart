import 'dart:convert';
import '../../../../core/storage/secure_storage_service.dart';
import '../dto/insight_dto.dart';

/// Local Data Source handling offline AI insights caching
class InsightsLocalDataSource {
  final SecureStorageService secureStorage;

  static const String _keyCachedInsights = 'KEY_CACHED_INSIGHTS';

  InsightsLocalDataSource({required this.secureStorage});

  /// Caches AI insights locally
  Future<void> cacheInsights(List<InsightDto> entries) async {
    final listJson = entries.map((e) => e.toJson()).toList();
    await secureStorage.write(
      key: _keyCachedInsights,
      value: jsonEncode(listJson),
    );
  }

  /// Retrieves cached AI insights
  Future<List<InsightDto>> getCachedInsights() async {
    final rawJson = await secureStorage.read(key: _keyCachedInsights);
    if (rawJson == null || rawJson.isEmpty) return [];

    try {
      final list = jsonDecode(rawJson) as List;
      return list.map((item) => InsightDto.fromJson(item as Map<String, dynamic>)).toList();
    } catch (_) {
      return [];
    }
  }
}
