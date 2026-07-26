import '../entities/community_failure.dart';
import '../entities/peer_user_entity.dart';
import '../repository/community_repository.dart';

/// Single responsibility UseCase to fetch peer match candidates
class GetPeerSuggestionsUseCase {
  final CommunityRepository repository;

  const GetPeerSuggestionsUseCase(this.repository);

  Future<({List<PeerUserEntity>? candidates, CommunityFailure? failure})> execute({String mode = 'smart'}) {
    return repository.getPeerSuggestions(mode: mode);
  }
}
