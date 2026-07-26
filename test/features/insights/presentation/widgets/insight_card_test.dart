import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_entity.dart';
import 'package:aiDepressionProject/features/insights/presentation/widgets/insight_card.dart';

void main() {
  testWidgets('InsightCard renders title, message, and sentiment badge', (tester) async {
    final insight = InsightEntity(
      insightId: 1,
      title: 'Mindfulness Benchmark',
      message: 'Great emotional consistency observed.',
      sentimentScore: 0.8,
      createdAt: DateTime.now(),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: InsightCard(insight: insight, isSpotlight: true),
        ),
      ),
    );

    expect(find.text('Mindfulness Benchmark'), findsOneWidget);
    expect(find.text('Great emotional consistency observed.'), findsOneWidget);
    expect(find.text('Positive Tone'), findsOneWidget);
  });
}
