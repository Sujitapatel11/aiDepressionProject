import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_entity.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_failure.dart';
import 'package:aiDepressionProject/features/insights/domain/repository/insight_repository.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/dismiss_insight_usecase.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/get_insights_usecase.dart';
import 'package:aiDepressionProject/features/insights/presentation/controllers/insight_list_controller.dart';
import 'package:aiDepressionProject/features/insights/presentation/screens/insights_home_screen.dart';

class MockIntegrationInsightRepo implements InsightRepository {
  @override
  Future<({List<InsightEntity>? insights, InsightFailure? failure})> getInsights() async {
    return (
      insights: [
        InsightEntity(
          insightId: 1,
          title: 'Resilience Benchmark',
          message: 'Strong coping mechanisms observed during busy work weeks.',
          sentimentScore: 0.8,
          createdAt: DateTime.now(),
        ),
      ],
      failure: null
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('AI Insights HomeScreen Integration Test', (tester) async {
    final mockRepo = MockIntegrationInsightRepo();
    final controller = InsightListController(
      getInsightsUseCase: GetInsightsUseCase(mockRepo),
      dismissInsightUseCase: DismissInsightUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: InsightsHomeScreen(controller: controller),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('AI Insights & Patterns'), findsOneWidget);
    expect(find.text('LATEST SPOTLIGHT INSIGHT'), findsOneWidget);
    expect(find.text('Resilience Benchmark'), findsOneWidget);
  });
}
