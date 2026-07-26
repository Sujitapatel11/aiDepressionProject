import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/recent_activity_card.dart';

void main() {
  testWidgets('RecentActivityCard renders EmptyDashboardView when preview is empty', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RecentActivityCard(latestJournalPreview: null),
        ),
      ),
    );

    expect(find.text('No Recent Activity'), findsOneWidget);
  });

  testWidgets('RecentActivityCard renders journal preview when present', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: RecentActivityCard(
            latestJournalPreview: 'Had a wonderful peaceful morning walk.',
          ),
        ),
      ),
    );

    expect(find.text('Journal Reflection'), findsOneWidget);
    expect(find.text('Had a wonderful peaceful morning walk.'), findsOneWidget);
  });
}
