import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/domain/entities/mood_entity.dart';
import 'package:aiDepressionProject/features/mood/presentation/widgets/mood_selector_card.dart';

void main() {
  testWidgets('MoodSelectorCard renders emoji, label, and responds to tap', (tester) async {
    final mood = MoodEntity.defaultMoods()[0]; // Very Happy
    bool tapped = false;

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MoodSelectorCard(
            mood: mood,
            isSelected: false,
            onTap: () => tapped = true,
          ),
        ),
      ),
    );

    expect(find.text('😄'), findsOneWidget);
    expect(find.text('Very Happy'), findsOneWidget);

    await tester.tap(find.byType(MoodSelectorCard));
    expect(tapped, isTrue);
  });
}
