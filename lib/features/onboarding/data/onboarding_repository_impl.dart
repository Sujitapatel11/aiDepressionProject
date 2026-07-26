import '../domain/onboarding_repository.dart';
import 'onboarding_local_datasource.dart';

/// Repository implementation for Onboarding data management
class OnboardingRepositoryImpl implements OnboardingRepository {
  final OnboardingLocalDataSource localDataSource;

  OnboardingRepositoryImpl({required this.localDataSource});

  @override
  Future<bool> isOnboardingCompleted() {
    return localDataSource.isOnboardingCompleted();
  }

  @override
  Future<void> setOnboardingCompleted() {
    return localDataSource.setOnboardingCompleted();
  }
}
