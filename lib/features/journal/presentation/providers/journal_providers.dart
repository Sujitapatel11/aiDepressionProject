import '../../../../core/config/app_config.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';
import '../../data/datasource/journal_local_datasource.dart';
import '../../data/datasource/journal_remote_datasource.dart';
import '../../data/repository/journal_repository_impl.dart';
import '../../domain/repository/journal_repository.dart';
import '../../domain/usecases/create_journal_usecase.dart';
import '../../domain/usecases/delete_journal_usecase.dart';
import '../../domain/usecases/get_journal_draft_usecase.dart';
import '../../domain/usecases/get_journals_usecase.dart';
import '../../domain/usecases/save_journal_draft_usecase.dart';
import '../../domain/usecases/update_journal_usecase.dart';
import '../controllers/journal_editor_controller.dart';
import '../controllers/journal_list_controller.dart';

/// Central dependency injection provider for Journal feature
abstract class JournalProviders {
  static JournalRemoteDataSource remoteDataSource({AppConfig config = AppConfig.local}) {
    return JournalRemoteDataSource(config: config);
  }

  static JournalLocalDataSource localDataSource() {
    return JournalLocalDataSource(secureStorage: AuthProviders.secureStorage);
  }

  static JournalRepository repository({AppConfig config = AppConfig.local}) {
    return JournalRepositoryImpl(
      remoteDataSource: remoteDataSource(config: config),
      localDataSource: localDataSource(),
      secureStorage: AuthProviders.secureStorage,
    );
  }

  static GetJournalsUseCase getJournalsUseCase({AppConfig config = AppConfig.local}) {
    return GetJournalsUseCase(repository(config: config));
  }

  static CreateJournalUseCase createJournalUseCase({AppConfig config = AppConfig.local}) {
    return CreateJournalUseCase(repository(config: config));
  }

  static UpdateJournalUseCase updateJournalUseCase({AppConfig config = AppConfig.local}) {
    return UpdateJournalUseCase(repository(config: config));
  }

  static DeleteJournalUseCase deleteJournalUseCase({AppConfig config = AppConfig.local}) {
    return DeleteJournalUseCase(repository(config: config));
  }

  static SaveJournalDraftUseCase saveJournalDraftUseCase({AppConfig config = AppConfig.local}) {
    return SaveJournalDraftUseCase(repository(config: config));
  }

  static GetJournalDraftUseCase getJournalDraftUseCase({AppConfig config = AppConfig.local}) {
    return GetJournalDraftUseCase(repository(config: config));
  }

  static JournalListController createListController({AppConfig config = AppConfig.local}) {
    return JournalListController(
      getJournalsUseCase: getJournalsUseCase(config: config),
      deleteJournalUseCase: deleteJournalUseCase(config: config),
    );
  }

  static JournalEditorController createEditorController({AppConfig config = AppConfig.local}) {
    return JournalEditorController(
      createJournalUseCase: createJournalUseCase(config: config),
      updateJournalUseCase: updateJournalUseCase(config: config),
      saveJournalDraftUseCase: saveJournalDraftUseCase(config: config),
      getJournalDraftUseCase: getJournalDraftUseCase(config: config),
    );
  }
}
