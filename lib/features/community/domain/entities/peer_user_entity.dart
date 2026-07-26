/// Pure domain entity representing a peer support match candidate
class PeerUserEntity {
  final int id;
  final String username;
  final int matchScore;
  final bool hasProfile;

  const PeerUserEntity({
    required this.id,
    required this.username,
    this.matchScore = 50,
    this.hasProfile = false,
  });

  PeerUserEntity copyWith({
    int? id,
    String? username,
    int? matchScore,
    bool? hasProfile,
  }) {
    return PeerUserEntity(
      id: id ?? this.id,
      username: username ?? this.username,
      matchScore: matchScore ?? this.matchScore,
      hasProfile: hasProfile ?? this.hasProfile,
    );
  }
}
