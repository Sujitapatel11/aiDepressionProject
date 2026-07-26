import 'package:flutter/foundation.dart';
import '../../../core/config/app_config.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../../data/datasources/auth_remote_datasource.dart';
import '../../onboarding/data/onboarding_local_datasource.dart';
import '../domain/app_initializer.dart';

/// Concrete infrastructure service performing startup routing checks
class AppInitializerServiceImpl implements AppInitializer {
  final OnboardingLocalDataSource onboardingDataSource;
  final SecureStorageService secureStorage;
  final AuthRemoteDataSource authRemoteDataSource;

  AppInitializerServiceImpl({
    required this.onboardingDataSource,
    required this.secureStorage,
    required this.authRemoteDataSource,
  });

  @override
  Future<InitialDestination> determineInitialDestination() async {
    try {
      // Step 1: Check Onboarding Completion Flag
      final isCompleted = await onboardingDataSource.isOnboardingCompleted();
      if (!isCompleted) {
        return InitialDestination.onboarding;
      }

      // Step 2: Read JWT Tokens from Secure Storage
      final accessToken = await secureStorage.getAccessToken();
      final refreshToken = await secureStorage.getRefreshToken();

      if (accessToken != null && accessToken.isNotEmpty) {
        // Access token exists -> user is authenticated
        return InitialDestination.dashboard;
      }

      // Step 3: Attempt Silent Refresh if Refresh Token Exists
      if (refreshToken != null && refreshToken.isNotEmpty) {
        try {
          final newAccessToken =
              await authRemoteDataSource.refreshToken(refreshToken);
          await secureStorage.saveTokens(
            accessToken: newAccessToken,
            refreshToken: refreshToken,
          );
          return InitialDestination.dashboard;
        } catch (e) {
          debugPrint("Silent JWT token refresh failed: $e");
          await secureStorage.clearTokens();
          return InitialDestination.login;
        }
      }

      // Step 4: No valid tokens -> Route to Login
      return InitialDestination.login;
    } catch (e) {
      debugPrint("AppInitializer error: $e");
      return InitialDestination.login;
    }
  }
}
