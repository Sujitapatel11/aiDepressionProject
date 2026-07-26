import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_entity.dart';
import 'package:aiDepressionProject/features/insights/domain/entities/insight_failure.dart';
import 'package:aiDepressionProject/features/insights/domain/repository/insight_repository.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/dismiss_insight_usecase.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/generate_insight_usecase.dart';
import 'package:aiDepressionProject/features/insights/domain/usecases/get_insights_usecase.dart';
import 'package:aiDepressionProject/features/insights/presentation/controllers/insight_list_controller.dart';
import 'package:aiDepressionProject/features/insights/presentation/state/insight_list_state.dart';

class MockInsightListRepo implements InsightRepository {
  List<InsightEntity> mockInsights = [
    InsightEntity(
      insightId: 1,
      title: 'Mindful Growth',
      message: 'Positive trend detected in reflections.',
      createdAt: DateTime.now(),
    ),
    InsightEntity(
      insightId: 2,
      title: 'Sleep & Mood Correlation',
      message: 'Evening walks improve morning restfulness.',
      createdAt: DateTime.now(),
    ),
  ];

  @override
  Future<({List<InsightEntity>? insights, InsightFailure? failure})> getInsights() async {
    return (insights: mockInsights, failure: null);
  }

  @override
  Future<({bool success, InsightFailure? failure})> dismissInsight(int insightId) async {
    mockInsights.removeWhere((i) => i.insightId == insightId);
    return (success: true, failure: null);
  }

  @override
  Future<({InsightEntity? insight, InsightFailure? failure})> generateForJournal(int journalId) async {
    final generated = InsightEntity(
      insightId: 99,
      title: 'Generated Reflection Insight',
      message: 'Fresh insight generated for journal $journalId',
      createdAt: DateTime.now(),
    );
    mockInsights.insert(0, generated);
    return (insight: generated, failure: null);
  }
}

void main() {
  late MockInsightListRepo mockRepo;
  late GetInsightsUseCase getUseCase;
  late DismissInsightUseCase dismissUseCase;
  late GenerateInsightUseCase generateUseCase;
  late InsightListController controller;

  setUp(() {
    mockRepo = MockInsightListRepo();
    getUseCase = GetInsightsUseCase(mockRepo);
    dismissUseCase = DismissInsightUseCase(mockRepo);
    generateUseCase = GenerateInsightUseCase(mockRepo);
    controller = InsightListController(
      getInsightsUseCase: getUseCase,
      dismissInsightUseCase: dismissUseCase,
      generateInsightUseCase: generateUseCase,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  group('InsightListController Refactored Unit Tests', () {
    test('loadInsights populates state with AI insights', () async {
      await controller.loadInsights();
      expect(controller.state.status, equals(InsightListStatus.data));
      expect(controller.state.insights.length, equals(2));
      expect(controller.state.spotlightInsight?.insightId, equals(1));
      expect(controller.state.historyInsights.length, equals(1));
    });

    test('dismissInsight removes insight from state', () async {
      await controller.loadInsights();
      final success = await controller.dismissInsight(1);
      expect(success, isTrue);
      expect(controller.state.insights.length, equals(1));
    });

    test('generateInsight adds newly generated insight to top', () async {
      await controller.loadInsights();
      final success = await controller.generateInsight(5);
      expect(success, isTrue);
      expect(controller.state.spotlightInsight?.insightId, equals(99));
    });
  });
}
