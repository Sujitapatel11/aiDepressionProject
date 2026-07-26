import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/mood/presentation/widgets/mood_note_input.dart';

void main() {
  testWidgets('MoodNoteInput renders text field and character counter', (tester) async {
    final textController = TextEditingController(text: 'Good morning');

    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: MoodNoteInput(
            textController: textController,
            maxLimit: 500,
          ),
        ),
      ),
    );

    expect(find.text('Optional Reflection'), findsOneWidget);
    expect(find.text('12 / 500'), findsOneWidget);
  });
}
