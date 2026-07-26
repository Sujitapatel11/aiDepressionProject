import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/domain/entities/dashboard_failure.dart';
import 'package:aiDepressionProject/features/dashboard/domain/entities/dashboard_summary_entity.dart';
import 'package:aiDepressionProject/features/dashboard/domain/repository/dashboard_repository.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/controllers/home_dashboard_controller.dart';
import 'package:aiDepressionProject/features/dashboard/presentation/state/home_dashboard_state.dart';

class MockDashboardRepository implements DashboardRepository {
  bool shouldFail = false;

  @override
  Future<({DashboardSummaryEntity? summary, DashboardFailure? failure})>
      getDashboardSummary() async {
    if (shouldFail) {
      return (summary: null, failure: const DashboardNetworkFailure());
    }
    return (
      summary: const DashboardSummaryEntity(
        userId: 1,
        username: "Maya",
        activeStreakDays: 5,
        moodState: "Calm",
        sentimentScore: 0.8,
        unreadNotificationsCount: 2,
        journalCount: 10,
      ),
      failure: null
    );
  }
}

void main() {
  late MockDashboardRepository mockRepo;
  late HomeDashboardController controller;

  setUp(() {
    mockRepo = MockDashboardRepository();
    controller = HomeDashboardController(repository: mockRepo);
  });

  tearDown(() {
    controller.dispose();
  });

  group('HomeDashboardController Unit Tests', () {
    test('initial state has loading status and empty summary', () {
      expect(controller.state.status, equals(HomeDashboardStatus.initial));
      expect(controller.state.summary, isNull);
    });

    test('loadDashboard updates state to data on success', () async {
      await controller.loadDashboard();

      expect(controller.state.status, equals(HomeDashboardStatus.data));
      expect(controller.state.summary, isNotNull);
      expect(controller.state.summary?.username, equals("Maya"));
      expect(controller.state.summary?.activeStreakDays, equals(5));
      expect(controller.state.isOffline, isFalse);
    });

    test('loadDashboard sets error state on repository failure without cache', () async {
      mockRepo.shouldFail = true;
      await controller.loadDashboard();

      expect(controller.state.status, equals(HomeDashboardStatus.error));
      expect(controller.state.failure, isA<DashboardNetworkFailure>());
    });

    test('refreshDashboard updates status to refreshing during update', () async {
      final refreshFuture = controller.refreshDashboard();
      expect(controller.state.status, equals(HomeDashboardStatus.refreshing));
      await refreshFuture;
      expect(controller.state.status, equals(HomeDashboardStatus.data));
    });
  });
}
