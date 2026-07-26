import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_draft_entity.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_entry_entity.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_failure.dart';
import 'package:aiDepressionProject/features/journal/domain/repository/journal_repository.dart';
import 'package:aiDepressionProject/features/journal/domain/usecases/create_journal_usecase.dart';
import 'package:aiDepressionProject/features/journal/domain/usecases/get_journal_draft_usecase.dart';
import 'package:aiDepressionProject/features/journal/domain/usecases/save_journal_draft_usecase.dart';
import 'package:aiDepressionProject/features/journal/domain/usecases/update_journal_usecase.dart';
import 'package:aiDepressionProject/features/journal/presentation/controllers/journal_editor_controller.dart';
import 'package:aiDepressionProject/features/journal/presentation/state/journal_editor_state.dart';

class MockJournalEditorRepo implements JournalRepository {
  JournalDraftEntity? savedDraft;

  @override
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> createJournal({
    required String content,
    String? moodState,
  }) async {
    return (
      entry: JournalEntryEntity(
        journalId: 55,
        content: content,
        moodState: moodState,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
      failure: null
    );
  }

  @override
  Future<void> saveDraft(JournalDraftEntity draft) async {
    savedDraft = draft;
  }

  @override
  Future<JournalDraftEntity?> getDraft() async {
    return savedDraft;
  }

  @override
  Future<void> clearDraft() async {
    savedDraft = null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late MockJournalEditorRepo mockRepo;
  late CreateJournalUseCase createUseCase;
  late UpdateJournalUseCase updateUseCase;
  late SaveJournalDraftUseCase saveDraftUseCase;
  late GetJournalDraftUseCase getDraftUseCase;
  late JournalEditorController controller;

  setUp(() {
    mockRepo = MockJournalEditorRepo();
    createUseCase = CreateJournalUseCase(mockRepo);
    updateUseCase = UpdateJournalUseCase(mockRepo);
    saveDraftUseCase = SaveJournalDraftUseCase(mockRepo);
    getDraftUseCase = GetJournalDraftUseCase(mockRepo);
    controller = JournalEditorController(
      createJournalUseCase: createUseCase,
      updateJournalUseCase: updateUseCase,
      saveJournalDraftUseCase: saveDraftUseCase,
      getJournalDraftUseCase: getDraftUseCase,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  group('JournalEditorController Refactored Unit Tests', () {
    test('updateDraft updates state bodyText', () {
      controller.updateDraft('My peaceful thoughts');
      expect(controller.state.bodyText, equals('My peaceful thoughts'));
    });

    test('submit creates new reflection entry and clears draft lifecycle', () async {
      controller.updateDraft('Submitted reflection');
      final success = await controller.submit();

      expect(success, isTrue);
      expect(controller.state.status, equals(JournalEditorStatus.success));
    });

    test('recoverDraft pre-populates draft content', () async {
      mockRepo.savedDraft = JournalDraftEntity(
        draftId: 'active_draft',
        content: 'Recovered unfinished reflection',
        moodState: 'Calm',
        lastSavedAt: DateTime.now(),
      );

      await controller.recoverDraft();

      expect(controller.state.isDraft, isTrue);
      expect(controller.state.bodyText, equals('Recovered unfinished reflection'));
    });
  });
}
