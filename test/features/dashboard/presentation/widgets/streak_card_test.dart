import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/streak_card.dart';

void main() {
  testWidgets('StreakCard renders streak counts and motivational text', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: StreakCard(
            activeStreakDays: 5,
            bestStreakDays: 10,
          ),
        ),
      ),
    );

    expect(find.text('5 Day Streak'), findsOneWidget);
    expect(find.text('Best: 10 d'), findsOneWidget);
    expect(find.text("You're building momentum! Keep checking in daily."), findsOneWidget);
  });
}
