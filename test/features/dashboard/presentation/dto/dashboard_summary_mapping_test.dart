import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/dashboard/data/dto/dashboard_summary_dto.dart';

void main() {
  group('DashboardSummary DTO & Entity Mapping Tests', () {
    test('fromJson correctly parses backend JSON structure', () {
      final jsonMap = {
        "pending_requests_count": 2,
        "active_connections_count": 3,
        "journal_count": 14,
        "latest_journal_preview": {
          "content": "Felt a bit anxious during work presentation...",
          "created_at": "2026-07-26T11:20:00Z"
        },
        "unread_insights_count": 1
      };

      final dto = DashboardSummaryDto.fromJson(jsonMap);
      expect(dto.pendingRequestsCount, equals(2));
      expect(dto.activeConnectionsCount, equals(3));
      expect(dto.journalCount, equals(14));
      expect(dto.unreadCount, equals(1));
      expect(dto.latestJournalPreview, contains("Felt a bit anxious"));

      final entity = dto.toEntity();
      expect(entity.pendingRequestsCount, equals(2));
      expect(entity.activeConnectionsCount, equals(3));
      expect(entity.journalCount, equals(14));
      expect(entity.unreadNotificationsCount, equals(1));
    });
  });
}
