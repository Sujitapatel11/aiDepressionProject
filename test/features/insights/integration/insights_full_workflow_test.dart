import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_entity.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_failure.dart';
import 'package:aiDepressionProject/features/insights/domain/repository/insight_repository.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/dismiss_insight_usecase.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/generate_insight_usecase.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/get_insights_usecase.dart';
import 'package:aiDepressionProject/features/insights/presentation/controllers/insight_list_controller.dart';
import 'package:aiDepressionProject/features/insights/presentation/screens/insights_home_screen.dart';

class MockWorkflowInsightRepo implements InsightRepository {
  List<InsightEntity> items = [
    InsightEntity(
      insightId: 1,
      title: 'Resilience Benchmark',
      message: 'Strong coping mechanisms observed during busy work weeks.',
      sentimentScore: 0.8,
      createdAt: DateTime.now(),
    ),
    InsightEntity(
      insightId: 2,
      title: 'Evening Calm Pattern',
      message: 'Reflections written after 8 PM show lower stress indicators.',
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<({List<InsightEntity>? insights, InsightFailure? failure})> getInsights() async {
    return (insights: items, failure: null);
  }

  @override
  Future<({bool success, InsightFailure? failure})> dismissInsight(int insightId) async {
    items.removeWhere((i) => i.insightId == insightId);
    return (success: true, failure: null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('Full AI Insights Workflow Integration Test', (tester) async {
    final mockRepo = MockWorkflowInsightRepo();
    final controller = InsightListController(
      getInsightsUseCase: GetInsightsUseCase(mockRepo),
      dismissInsightUseCase: DismissInsightUseCase(mockRepo),
      generateInsightUseCase: GenerateInsightUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: InsightsHomeScreen(controller: controller),
      ),
    );

    await tester.pumpAndSettle();

    // 1. Verify screen title, spotlight, and history titles
    expect(find.text('AI Insights & Patterns'), findsOneWidget);
    expect(find.text('LATEST SPOTLIGHT INSIGHT'), findsOneWidget);
    expect(find.text('Resilience Benchmark'), findsOneWidget);
    expect(find.text('Insight History'), findsOneWidget);
    expect(find.text('Evening Calm Pattern'), findsOneWidget);
  });
}
