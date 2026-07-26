import 'package:flutter/material.dart';
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
import 'package:aiDepressionProject/features/journal/presentation/screens/journal_editor_screen.dart';

class MockWorkflowJournalRepo implements JournalRepository {
  JournalEntryEntity? createdEntry;
  JournalDraftEntity? draftStorage;

  @override
  Future<({JournalEntryEntity? entry, JournalFailure? failure})> createJournal({
    required String content,
    String? moodState,
  }) async {
    createdEntry = JournalEntryEntity(
      journalId: 77,
      content: content,
      moodState: moodState,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    return (entry: createdEntry, failure: null);
  }

  @override
  Future<void> saveDraft(JournalDraftEntity draft) async {
    draftStorage = draft;
  }

  @override
  Future<JournalDraftEntity?> getDraft() async {
    return draftStorage;
  }

  @override
  Future<void> clearDraft() async {
    draftStorage = null;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('Full Journal Reflection Creation & Save Workflow Test', (tester) async {
    final mockRepo = MockWorkflowJournalRepo();
    bool savedCallback = false;

    final controller = JournalEditorController(
      createJournalUseCase: CreateJournalUseCase(mockRepo),
      updateJournalUseCase: UpdateJournalUseCase(mockRepo),
      saveJournalDraftUseCase: SaveJournalDraftUseCase(mockRepo),
      getJournalDraftUseCase: GetJournalDraftUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: JournalEditorScreen(
          controller: controller,
          onSuccess: () => savedCallback = true,
        ),
      ),
    );

    // 1. Enter text in body area
    final bodyField = find.byType(TextField);
    expect(bodyField, findsOneWidget);
    await tester.enterText(bodyField, 'Peaceful evening reflection');
    await tester.pumpAndSettle();

    // 2. Tap Save Reflection Button
    final saveButton = find.text('Save Reflection');
    expect(saveButton, findsOneWidget);
    await tester.tap(saveButton);
    await tester.pumpAndSettle();

    // 3. Verify save success and repo entry
    expect(savedCallback, isTrue);
    expect(mockRepo.createdEntry?.content, equals('Peaceful evening reflection'));
  });
}
