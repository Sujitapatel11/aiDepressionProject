import '../entities/dashboard_failure.dart';
import '../entities/dashboard_summary_entity.dart';

/// Abstract domain repository interface for Dashboard operations
abstract class DashboardRepository {
  Future<({DashboardSummaryEntity? summary, DashboardFailure? failure})>
      getDashboardSummary();
}
