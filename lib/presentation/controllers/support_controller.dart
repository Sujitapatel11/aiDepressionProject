import 'package:flutter/material.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../data/datasources/support_remote_datasource.dart';
import '../../data/models/connection_model.dart';

class SupportController extends ChangeNotifier {
  final SupportRemoteDataSource dataSource;
  final SecureStorageService storageService;

  SupportController({
    required this.dataSource,
    required this.storageService,
  });

  List<ConnectionModel> _connections = [];
  List<ConnectionModel> get connections => _connections;

  List<ConnectionModel> _availableUsers = [];
  List<ConnectionModel> get availableUsers => _availableUsers;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  Future<void> loadSupportData() async {
    _isLoading = true;
    notifyListeners();

    try {
      final token = await storageService.getAccessToken();
      if (token != null) {
        _connections = await dataSource.fetchActiveConnections(token);
        _availableUsers = await dataSource.fetchAvailableUsers(token);
      }
    } catch (_) {
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> sendRequest(int userId) async {
    try {
      final token = await storageService.getAccessToken();
      if (token != null) {
        await dataSource.sendSupportRequest(token, userId);
        _availableUsers.removeWhere((e) => e.userId == userId);
        notifyListeners();
      }
    } catch (_) {}
  }
}
