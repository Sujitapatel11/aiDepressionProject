import '../entities/community_failure.dart';
import '../repository/community_repository.dart';

/// Single responsibility UseCase to block or disconnect an active connection
class ManageConnectionUseCase {
  final CommunityRepository repository;

  const ManageConnectionUseCase(this.repository);

  Future<({bool success, CommunityFailure? failure})> block(String connectionId) {
    return repository.blockConnection(connectionId);
  }

  Future<({bool success, CommunityFailure? failure})> disconnect(String connectionId) {
    return repository.disconnectConnection(connectionId);
  }
}
