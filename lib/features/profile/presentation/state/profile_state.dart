import '../../domain/entities/personality_profile_entity.dart';
import '../../domain/entities/profile_failure.dart';
import '../../domain/entities/user_profile_entity.dart';

enum ProfileStatus {
  initial,
  loading,
  refreshing,
  data,
  editing,
  saving,
  offline,
  cached,
  error,
}

/// Immutable state container for Profile & Settings screen
class ProfileState {
  final ProfileStatus status;
  final UserProfileEntity? userProfile;
  final PersonalityProfileEntity? personalityProfile;
  final ProfileFailure? failure;
  final bool isOffline;
  final DateTime? lastCachedAt;

  const ProfileState({
    this.status = ProfileStatus.initial,
    this.userProfile,
    this.personalityProfile,
    this.failure,
    this.isOffline = false,
    this.lastCachedAt,
  });

  bool get isLoading => status == ProfileStatus.loading;
  bool get isRefreshing => status == ProfileStatus.refreshing;
  bool get isSaving => status == ProfileStatus.saving;
  bool get isEditing => status == ProfileStatus.editing;
  bool get isError => status == ProfileStatus.error;
  bool get isCached => status == ProfileStatus.cached;
  bool get hasData => userProfile != null;

  ProfileState copyWith({
    ProfileStatus? status,
    UserProfileEntity? userProfile,
    PersonalityProfileEntity? personalityProfile,
    ProfileFailure? failure,
    bool? isOffline,
    DateTime? lastCachedAt,
  }) {
    return ProfileState(
      status: status ?? this.status,
      userProfile: userProfile ?? this.userProfile,
      personalityProfile: personalityProfile ?? this.personalityProfile,
      failure: failure ?? this.failure,
      isOffline: isOffline ?? this.isOffline,
      lastCachedAt: lastCachedAt ?? this.lastCachedAt,
    );
  }
}
