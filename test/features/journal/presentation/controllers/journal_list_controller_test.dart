import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_entry_entity.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_failure.dart';
import 'package:aiDepressionProject/features/journal/domain/repository/journal_repository.dart';
import 'package:aiDepressionProject/features/journal/domain/usecases/delete_journal_usecase.dart';
import 'package:aiDepressionProject/features/journal/domain/usecases/get_journals_usecase.dart';
import 'package:aiDepressionProject/features/journal/presentation/controllers/journal_list_controller.dart';
import 'package:aiDepressionProject/features/journal/presentation/state/journal_list_state.dart';

class MockJournalListRepo implements JournalRepository {
  List<JournalEntryEntity> mockEntries = [
    JournalEntryEntity(
      journalId: 1,
      content: 'Morning mindfulness session',
      moodState: 'Calm',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    JournalEntryEntity(
      journalId: 2,
      content: 'Evening walk thoughts',
      moodState: 'Happy',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
  ];

  @override
  Future<({List<JournalEntryEntity>? entries, JournalFailure? failure})> getJournals() async {
    return (entries: mockEntries, failure: null);
  }

  @override
  Future<({bool success, JournalFailure? failure})> deleteJournal(int journalId) async {
    mockEntries.removeWhere((e) => e.journalId == journalId);
    return (success: true, failure: null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late MockJournalListRepo mockRepo;
  late GetJournalsUseCase getUseCase;
  late DeleteJournalUseCase deleteUseCase;
  late JournalListController controller;

  setUp(() {
    mockRepo = MockJournalListRepo();
    getUseCase = GetJournalsUseCase(mockRepo);
    deleteUseCase = DeleteJournalUseCase(mockRepo);
    controller = JournalListController(
      getJournalsUseCase: getUseCase,
      deleteJournalUseCase: deleteUseCase,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  group('JournalListController Refactored Unit Tests', () {
    test('loadTimeline populates state with timeline entries', () async {
      await controller.loadTimeline();
      expect(controller.state.status, equals(JournalListStatus.data));
      expect(controller.state.entries.length, equals(2));
    });

    test('search filters timeline entries by query', () async {
      await controller.loadTimeline();
      controller.search('mindfulness');
      expect(controller.state.filteredEntries.length, equals(1));
      expect(controller.state.filteredEntries.first.content, contains('mindfulness'));
    });

    test('filter filters timeline entries by mood tag chip', () async {
      await controller.loadTimeline();
      controller.filter('Happy');
      expect(controller.state.filteredEntries.length, equals(1));
      expect(controller.state.filteredEntries.first.moodState, equals('Happy'));
    });

    test('delete soft-deletes entry and updates state', () async {
      await controller.loadTimeline();
      final success = await controller.delete(1);
      expect(success, isTrue);
      expect(controller.state.entries.length, equals(1));
    });
  });
}
