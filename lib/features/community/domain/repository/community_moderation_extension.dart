import 'entities/community_failure.dart';

/// Extension contract preparing future post reporting & community moderation
abstract class CommunityModerationExtension {
  /// Prepares reporting inappropriate community content
  Future<({bool success, CommunityFailure? failure})> reportPost(int postId, String reason);
}
