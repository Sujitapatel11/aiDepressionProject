import '../../../../core/config/app_config.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';
import '../../data/datasource/profile_local_datasource.dart';
import '../../data/datasource/profile_remote_datasource.dart';
import '../../data/repository/profile_repository_impl.dart';
import '../../domain/repository/profile_repository.dart';
import '../../domain/usecases/get_personality_profile_usecase.dart';
import '../../domain/usecases/get_user_profile_usecase.dart';
import '../../domain/usecases/logout_user_usecase.dart';
import '../../domain/usecases/update_user_profile_usecase.dart';
import '../controllers/profile_controller.dart';

/// Central dependency injection provider for Profile & Settings feature
abstract class ProfileProviders {
  static ProfileRemoteDataSource remoteDataSource({AppConfig config = AppConfig.local}) {
    return ProfileRemoteDataSource(config: config);
  }

  static ProfileLocalDataSource localDataSource() {
    return ProfileLocalDataSource(secureStorage: AuthProviders.secureStorage);
  }

  static ProfileRepository repository({AppConfig config = AppConfig.local}) {
    return ProfileRepositoryImpl(
      remoteDataSource: remoteDataSource(config: config),
      localDataSource: localDataSource(),
      secureStorage: AuthProviders.secureStorage,
      authRepository: AuthProviders.repository(config: config),
    );
  }

  static GetUserProfileUseCase getUserProfileUseCase({AppConfig config = AppConfig.local}) {
    return GetUserProfileUseCase(repository(config: config));
  }

  static GetPersonalityProfileUseCase getPersonalityProfileUseCase({AppConfig config = AppConfig.local}) {
    return GetPersonalityProfileUseCase(repository(config: config));
  }

  static UpdateUserProfileUseCase updateUserProfileUseCase({AppConfig config = AppConfig.local}) {
    return UpdateUserProfileUseCase(repository(config: config));
  }

  static LogoutUserUseCase logoutUserUseCase({AppConfig config = AppConfig.local}) {
    return LogoutUserUseCase(repository(config: config));
  }

  static ProfileController createProfileController({AppConfig config = AppConfig.local}) {
    return ProfileController(
      getUserProfileUseCase: getUserProfileUseCase(config: config),
      getPersonalityProfileUseCase: getPersonalityProfileUseCase(config: config),
      updateUserProfileUseCase: updateUserProfileUseCase(config: config),
      logoutUserUseCase: logoutUserUseCase(config: config),
    );
  }
}
