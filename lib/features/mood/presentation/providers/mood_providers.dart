import '../../../../core/config/app_config.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';
import '../../data/datasource/mood_remote_datasource.dart';
import '../../data/repository/mood_repository_impl.dart';
import '../../domain/repository/mood_repository.dart';
import '../../domain/usecases/get_todays_mood_usecase.dart';
import '../../domain/usecases/submit_mood_checkin_usecase.dart';
import '../controllers/mood_checkin_controller.dart';

/// Central dependency injection provider for Mood feature
abstract class MoodProviders {
  static MoodRemoteDataSource dataSource({AppConfig config = AppConfig.local}) {
    return MoodRemoteDataSource(config: config);
  }

  static MoodRepository repository({AppConfig config = AppConfig.local}) {
    return MoodRepositoryImpl(
      remoteDataSource: dataSource(config: config),
      secureStorage: AuthProviders.secureStorage,
    );
  }

  static GetTodaysMoodUseCase getTodaysMoodUseCase({AppConfig config = AppConfig.local}) {
    return GetTodaysMoodUseCase(repository(config: config));
  }

  static SubmitMoodCheckInUseCase submitMoodCheckInUseCase({AppConfig config = AppConfig.local}) {
    return SubmitMoodCheckInUseCase(repository(config: config));
  }

  static MoodCheckInController createController({AppConfig config = AppConfig.local}) {
    return MoodCheckInController(
      getTodaysMoodUseCase: getTodaysMoodUseCase(config: config),
      submitMoodCheckInUseCase: submitMoodCheckInUseCase(config: config),
    );
  }
}
