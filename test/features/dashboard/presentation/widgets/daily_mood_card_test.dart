import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/daily_mood_card.dart';

void main() {
  testWidgets('DailyMoodCard renders prompt view when mood is missing', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DailyMoodCard(moodState: null),
        ),
      ),
    );

    expect(find.text('How are you feeling today?'), findsOneWidget);
    expect(find.text('Mood Check-In'), findsOneWidget);
  });

  testWidgets('DailyMoodCard renders logged mood state when present', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DailyMoodCard(moodState: 'Peaceful'),
        ),
      ),
    );

    expect(find.text("Today's Mood"), findsOneWidget);
    expect(find.text('Peaceful'), findsOneWidget);
  });
}
