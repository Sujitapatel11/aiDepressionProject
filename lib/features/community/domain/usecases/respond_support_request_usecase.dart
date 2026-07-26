import '../entities/community_failure.dart';
import '../entities/support_connection_entity.dart';
import '../repository/community_repository.dart';

/// Single responsibility UseCase to accept or reject an incoming support request
class RespondSupportRequestUseCase {
  final CommunityRepository repository;

  const RespondSupportRequestUseCase(this.repository);

  Future<({SupportConnectionEntity? connection, CommunityFailure? failure})> accept(int requestId) {
    return repository.acceptRequest(requestId);
  }

  Future<({bool success, CommunityFailure? failure})> reject(int requestId) {
    return repository.rejectRequest(requestId);
  }
}
