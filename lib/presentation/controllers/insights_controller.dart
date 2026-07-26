import 'package:flutter/material.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../data/datasources/insights_remote_datasource.dart';
import '../../data/models/insight_model.dart';

class InsightsController extends ChangeNotifier {
  final InsightsRemoteDataSource dataSource;
  final SecureStorageService storageService;

  InsightsController({
    required this.dataSource,
    required this.storageService,
  });

  List<InsightModel> _insights = [];
  List<InsightModel> get insights => _insights;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> loadInsights() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await storageService.getAccessToken();
      if (token != null) {
        _insights = await dataSource.fetchInsights(token);
      }
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> dismissInsight(int insightId) async {
    _insights.removeWhere((e) => e.id == insightId);
    notifyListeners();

    try {
      final token = await storageService.getAccessToken();
      if (token != null) {
        await dataSource.dismissInsight(token, insightId);
      }
    } catch (_) {}
  }
}
