import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/today_insight_card.dart';

void main() {
  testWidgets('TodayInsightCard renders clean placeholder when insight unavailable', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TodayInsightCard(),
        ),
      ),
    );

    expect(find.text("Today's AI Insight"), findsOneWidget);
    expect(find.text("No AI Insights Available Yet"), findsOneWidget);
  });

  testWidgets('TodayInsightCard renders backend insight content when available', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: TodayInsightCard(
            title: 'Evening Stress Pattern',
            message: 'Try a 5-minute breathing exercise before bedtime.',
            moodTag: 'Calm',
          ),
        ),
      ),
    );

    expect(find.text('Evening Stress Pattern'), findsOneWidget);
    expect(find.text('Try a 5-minute breathing exercise before bedtime.'), findsOneWidget);
    expect(find.text('Calm'), findsOneWidget);
  });
}
