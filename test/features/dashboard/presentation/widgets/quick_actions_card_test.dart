import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/quick_actions_card.dart';

void main() {
  testWidgets('QuickActionsCard renders 4 quick action tiles', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: QuickActionsCard(),
        ),
      ),
    );

    expect(find.text('Quick Actions'), findsOneWidget);
    expect(find.text('New Journal'), findsOneWidget);
    expect(find.text('View Insights'), findsOneWidget);
    expect(find.text('Community'), findsOneWidget);
    expect(find.text('Mood Check-In'), findsOneWidget);
  });
}
