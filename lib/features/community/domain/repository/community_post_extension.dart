import 'entities/community_failure.dart';

/// Extension contract preparing future public community wall posts & reactions
abstract class CommunityPostExtension {
  /// Prepares post creation
  Future<({bool success, CommunityFailure? failure})> createPublicPost(String content);

  /// Prepares post reaction
  Future<({bool success, CommunityFailure? failure})> reactToPost(int postId, String reactionType);

  /// Prepares post comment
  Future<({bool success, CommunityFailure? failure})> addComment(int postId, String commentText);
}
