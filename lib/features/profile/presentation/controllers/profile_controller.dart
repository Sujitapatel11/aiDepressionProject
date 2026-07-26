import 'package:flutter/foundation.dart';
import '../../domain/usecases/get_personality_profile_usecase.dart';
import '../../domain/usecases/get_user_profile_usecase.dart';
import '../../domain/usecases/logout_user_usecase.dart';
import '../../domain/usecases/update_user_profile_usecase.dart';
import '../state/profile_state.dart';

/// Presentation controller exposing state and standardized actions: loadProfile(), refresh(), updateProfile(), loadCachedProfile(), logout()
class ProfileController extends ChangeNotifier {
  final GetUserProfileUseCase getUserProfileUseCase;
  final GetPersonalityProfileUseCase getPersonalityProfileUseCase;
  final UpdateUserProfileUseCase updateUserProfileUseCase;
  final LogoutUserUseCase logoutUserUseCase;

  ProfileState _state = const ProfileState();
  ProfileState get state => _state;

  ProfileController({
    required this.getUserProfileUseCase,
    required this.getPersonalityProfileUseCase,
    required this.updateUserProfileUseCase,
    required this.logoutUserUseCase,
  });

  /// Action: Loads user profile identity and Big Five personality traits
  Future<void> loadProfile() async {
    if (!_state.hasData) {
      _state = _state.copyWith(status: ProfileStatus.loading);
      notifyListeners();
    }

    final userResult = await getUserProfileUseCase.execute();
    final personalityResult = await getPersonalityProfileUseCase.execute();

    final isOffline = userResult.failure != null || personalityResult.failure != null;

    _state = _state.copyWith(
      status: isOffline ? ProfileStatus.cached : ProfileStatus.data,
      userProfile: userResult.profile ?? _state.userProfile,
      personalityProfile: personalityResult.personality ?? _state.personalityProfile,
      isOffline: isOffline,
      failure: userResult.failure ?? personalityResult.failure,
      lastCachedAt: DateTime.now(),
    );
    notifyListeners();
  }

  /// Action: Loads cached profile explicitly for offline fallback
  Future<void> loadCachedProfile() async {
    await loadProfile();
  }

  /// Action: Pull-to-refresh handler
  Future<void> refresh() async {
    _state = _state.copyWith(status: ProfileStatus.refreshing);
    notifyListeners();
    await loadProfile();
  }

  /// Action: Updates user display name
  Future<bool> updateProfile(String displayName) async {
    _state = _state.copyWith(status: ProfileStatus.saving);
    notifyListeners();

    final result = await updateUserProfileUseCase.execute(displayName);
    if (result.profile != null) {
      _state = _state.copyWith(
        status: ProfileStatus.data,
        userProfile: result.profile,
        failure: null,
      );
      notifyListeners();
      return true;
    } else {
      _state = _state.copyWith(
        status: ProfileStatus.data,
        failure: result.failure,
      );
      notifyListeners();
      return false;
    }
  }

  /// Action: Executes session logout
  Future<void> logout() async {
    await logoutUserUseCase.execute();
    _state = const ProfileState();
    notifyListeners();
  }
}
