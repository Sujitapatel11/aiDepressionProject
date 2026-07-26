import '../../../../core/config/app_config.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../data/datasource/auth_api_client.dart';
import '../../data/repository/auth_repository_impl.dart';
import '../../data/services/google_auth_service.dart';
import '../../data/services/google_auth_service_impl.dart';
import '../../domain/repository/auth_repository.dart';
import '../../domain/usecases/login_usecase.dart';

/// Centralized factory instances for Authentication Foundation
class AuthProviders {
  static final SecureStorageService secureStorage = SecureStorageService();
  static final GoogleAuthService googleAuthService = GoogleAuthServiceImpl();

  static AuthApiClient apiClient({AppConfig config = AppConfig.local}) {
    return AuthApiClient(config: config);
  }

  static AuthRepository repository({AppConfig config = AppConfig.local}) {
    return AuthRepositoryImpl(
      apiClient: apiClient(config: config),
      secureStorage: secureStorage,
    );
  }

  static LoginUseCase loginUseCase({AppConfig config = AppConfig.local}) {
    return LoginUseCase(repository(config: config));
  }
}
