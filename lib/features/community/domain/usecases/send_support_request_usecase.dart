import '../entities/community_failure.dart';
import '../entities/support_request_entity.dart';
import '../repository/community_repository.dart';

/// Single responsibility UseCase to send a peer support connection request
class SendSupportRequestUseCase {
  final CommunityRepository repository;

  const SendSupportRequestUseCase(this.repository);

  Future<({SupportRequestEntity? request, CommunityFailure? failure})> execute(int userId) {
    return repository.sendSupportRequest(userId);
  }
}
