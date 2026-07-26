import '../../../../core/config/app_config.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';
import '../../data/datasource/community_local_datasource.dart';
import '../../data/datasource/community_remote_datasource.dart';
import '../../data/repository/community_repository_impl.dart';
import '../../domain/repository/community_repository.dart';
import '../../domain/usecases/get_incoming_requests_usecase.dart';
import '../../domain/usecases/get_peer_suggestions_usecase.dart';
import '../../domain/usecases/get_support_connections_usecase.dart';
import '../../domain/usecases/manage_connection_usecase.dart';
import '../../domain/usecases/respond_support_request_usecase.dart';
import '../../domain/usecases/send_support_request_usecase.dart';
import '../controllers/community_feed_controller.dart';

/// Central dependency injection provider for Community feature
abstract class CommunityProviders {
  static CommunityRemoteDataSource remoteDataSource({AppConfig config = AppConfig.local}) {
    return CommunityRemoteDataSource(config: config);
  }

  static CommunityLocalDataSource localDataSource() {
    return CommunityLocalDataSource(secureStorage: AuthProviders.secureStorage);
  }

  static CommunityRepository repository({AppConfig config = AppConfig.local}) {
    return CommunityRepositoryImpl(
      remoteDataSource: remoteDataSource(config: config),
      localDataSource: localDataSource(),
      secureStorage: AuthProviders.secureStorage,
    );
  }

  static GetPeerSuggestionsUseCase getPeerSuggestionsUseCase({AppConfig config = AppConfig.local}) {
    return GetPeerSuggestionsUseCase(repository(config: config));
  }

  static GetSupportConnectionsUseCase getSupportConnectionsUseCase({AppConfig config = AppConfig.local}) {
    return GetSupportConnectionsUseCase(repository(config: config));
  }

  static GetIncomingRequestsUseCase getIncomingRequestsUseCase({AppConfig config = AppConfig.local}) {
    return GetIncomingRequestsUseCase(repository(config: config));
  }

  static SendSupportRequestUseCase sendSupportRequestUseCase({AppConfig config = AppConfig.local}) {
    return SendSupportRequestUseCase(repository(config: config));
  }

  static RespondSupportRequestUseCase respondSupportRequestUseCase({AppConfig config = AppConfig.local}) {
    return RespondSupportRequestUseCase(repository(config: config));
  }

  static ManageConnectionUseCase manageConnectionUseCase({AppConfig config = AppConfig.local}) {
    return ManageConnectionUseCase(repository(config: config));
  }

  static CommunityFeedController createFeedController({AppConfig config = AppConfig.local}) {
    return CommunityFeedController(
      getPeerSuggestionsUseCase: getPeerSuggestionsUseCase(config: config),
      getSupportConnectionsUseCase: getSupportConnectionsUseCase(config: config),
      getIncomingRequestsUseCase: getIncomingRequestsUseCase(config: config),
      sendSupportRequestUseCase: sendSupportRequestUseCase(config: config),
      respondSupportRequestUseCase: respondSupportRequestUseCase(config: config),
      manageConnectionUseCase: manageConnectionUseCase(config: config),
    );
  }
}
