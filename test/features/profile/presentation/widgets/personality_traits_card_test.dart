import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/personality_profile_entity.dart';
import 'package:aiDepressionProject/features/profile/presentation/widgets/personality_traits_card.dart';

void main() {
  testWidgets('PersonalityTraitsCard renders Big Five traits and progress bars', (tester) async {
    const personality = PersonalityProfileEntity(
      openness: 0.85,
      conscientiousness: 0.75,
      hasData: true,
    );

    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: PersonalityTraitsCard(personality: personality),
        ),
      ),
    );

    expect(find.text('BIG FIVE PERSONALITY METRICS'), findsOneWidget);
    expect(find.text('Openness'), findsOneWidget);
    expect(find.text('85%'), findsOneWidget);
    expect(find.text('Conscientiousness'), findsOneWidget);
    expect(find.text('75%'), findsOneWidget);
  });
}
