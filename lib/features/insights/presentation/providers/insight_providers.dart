import '../../../../core/config/app_config.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';
import '../../data/datasource/insights_local_datasource.dart';
import '../../data/datasource/insights_remote_datasource.dart';
import '../../data/repository/insight_repository_impl.dart';
import '../../domain/repository/insight_repository.dart';
import '../../domain/usecases/dismiss_insight_usecase.dart';
import '../../domain/usecases/generate_insight_usecase.dart';
import '../../domain/usecases/get_insights_usecase.dart';
import '../controllers/insight_list_controller.dart';

/// Central dependency injection provider for AI Insights feature
abstract class InsightProviders {
  static InsightsRemoteDataSource remoteDataSource({AppConfig config = AppConfig.local}) {
    return InsightsRemoteDataSource(config: config);
  }

  static InsightsLocalDataSource localDataSource() {
    return InsightsLocalDataSource(secureStorage: AuthProviders.secureStorage);
  }

  static InsightRepository repository({AppConfig config = AppConfig.local}) {
    return InsightRepositoryImpl(
      remoteDataSource: remoteDataSource(config: config),
      localDataSource: localDataSource(),
      secureStorage: AuthProviders.secureStorage,
    );
  }

  static GetInsightsUseCase getInsightsUseCase({AppConfig config = AppConfig.local}) {
    return GetInsightsUseCase(repository(config: config));
  }

  static DismissInsightUseCase dismissInsightUseCase({AppConfig config = AppConfig.local}) {
    return DismissInsightUseCase(repository(config: config));
  }

  static GenerateInsightUseCase generateInsightUseCase({AppConfig config = AppConfig.local}) {
    return GenerateInsightUseCase(repository(config: config));
  }

  static InsightListController createListController({AppConfig config = AppConfig.local}) {
    return InsightListController(
      getInsightsUseCase: getInsightsUseCase(config: config),
      dismissInsightUseCase: dismissInsightUseCase(config: config),
    );
  }
}
