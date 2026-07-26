import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/welcome_header.dart';

void main() {
  testWidgets('WelcomeHeader renders greeting, username, date and initial avatar', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: WelcomeHeader(
            userName: 'Maya',
            greeting: 'Good Morning',
            formattedDate: 'Sunday, Jul 26',
          ),
        ),
      ),
    );

    expect(find.text('Good Morning, '), findsOneWidget);
    expect(find.text('Maya 👋'), findsOneWidget);
    expect(find.text('Sunday, Jul 26'), findsOneWidget);
    expect(find.text('M'), findsOneWidget); // Initial in avatar
  });
}
