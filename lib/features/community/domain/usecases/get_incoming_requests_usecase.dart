import '../entities/community_failure.dart';
import '../entities/support_request_entity.dart';
import '../repository/community_repository.dart';

/// Single responsibility UseCase to fetch incoming support requests
class GetIncomingRequestsUseCase {
  final CommunityRepository repository;

  const GetIncomingRequestsUseCase(this.repository);

  Future<({List<SupportRequestEntity>? requests, CommunityFailure? failure})> execute() {
    return repository.getIncomingRequests();
  }
}
