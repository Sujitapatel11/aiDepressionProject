import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/offline_banner.dart';

void main() {
  testWidgets('OfflineBanner renders message and offline icon', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: OfflineBanner(),
        ),
      ),
    );

    expect(find.text('Offline Mode - Displaying cached data'), findsOneWidget);
    expect(find.byIcon(Icons.wifi_off_rounded), findsOneWidget);
  });
}
