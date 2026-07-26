import '../entities/community_failure.dart';
import '../entities/support_connection_entity.dart';
import '../repository/community_repository.dart';

/// Single responsibility UseCase to fetch active peer connections
class GetSupportConnectionsUseCase {
  final CommunityRepository repository;

  const GetSupportConnectionsUseCase(this.repository);

  Future<({List<SupportConnectionEntity>? connections, CommunityFailure? failure})> execute() {
    return repository.getActiveConnections();
  }
}
