import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/widgets/dashboard_summary_card.dart';

void main() {
  testWidgets('DashboardSummaryCard renders all 4 executive metrics', (tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: DashboardSummaryCard(
            journalCount: 12,
            activeConnectionsCount: 4,
            pendingRequestsCount: 2,
            unreadInsightsCount: 1,
          ),
        ),
      ),
    );

    expect(find.text('Dashboard Summary'), findsOneWidget);
    expect(find.text('12'), findsOneWidget);
    expect(find.text('4'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('1'), findsOneWidget);
  });
}
