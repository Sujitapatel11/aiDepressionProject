import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/journal/domain/entities/journal_entry_entity.dart';
import 'package:aiDepressionProject/features/journal/presentation/widgets/journal_timeline_card.dart';

void main() {
  testWidgets('JournalTimelineCard renders snippet and mood badge', (tester) async {
    final entry = JournalEntryEntity(
      journalId: 1,
      content: 'Gratitude for nature walk',
      moodState: 'Calm',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: JournalTimelineCard(entry: entry),
        ),
      ),
    );

    expect(find.text('Gratitude for nature walk'), findsOneWidget);
    expect(find.text('Calm'), findsOneWidget);
  });
}
