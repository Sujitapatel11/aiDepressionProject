import '../../../../core/config/app_config.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../datasource/dashboard_api_client.dart';
import '../repository/dashboard_repository_impl.dart';
import '../../domain/repository/dashboard_repository.dart';

/// Centralized Factory for Dashboard Foundation instances
class DashboardProviders {
  static final SecureStorageService secureStorage = SecureStorageService();

  static DashboardApiClient apiClient({AppConfig config = AppConfig.local}) {
    return DashboardApiClient(config: config);
  }

  static DashboardRepository repository({AppConfig config = AppConfig.local}) {
    return DashboardRepositoryImpl(
      apiClient: apiClient(config: config),
      secureStorage: secureStorage,
    );
  }
}
