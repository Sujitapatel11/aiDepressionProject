import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/personality_profile_entity.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/profile_failure.dart';
import 'package:aiDepressionProject/features/profile/domain/entities/user_profile_entity.dart';
import 'package:aiDepressionProject/features/profile/domain/repository/profile_repository.dart';
import 'package:aiDepressionProject/features/profile/domain/usecases/get_personality_profile_usecase.dart';
import 'package:aiDepressionProject/features/profile/domain/usecases/get_user_profile_usecase.dart';
import 'package:aiDepressionProject/features/profile/domain/usecases/logout_user_usecase.dart';
import 'package:aiDepressionProject/features/profile/domain/usecases/update_user_profile_usecase.dart';
import 'package:aiDepressionProject/features/profile/presentation/controllers/profile_controller.dart';
import 'package:aiDepressionProject/features/profile/presentation/state/profile_state.dart';

class MockProfileRepo implements ProfileRepository {
  UserProfileEntity mockUser = const UserProfileEntity(
    id: 1,
    username: 'test_user',
    email: 'test@example.com',
    displayName: 'Test User',
  );

  PersonalityProfileEntity mockPersonality = const PersonalityProfileEntity(
    openness: 0.8,
    conscientiousness: 0.7,
    hasData: true,
  );

  @override
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> getUserProfile() async {
    return (profile: mockUser, failure: null);
  }

  @override
  Future<({PersonalityProfileEntity? personality, ProfileFailure? failure})> getPersonalityProfile() async {
    return (personality: mockPersonality, failure: null);
  }

  @override
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> updateDisplayName(String displayName) async {
    mockUser = mockUser.copyWith(displayName: displayName);
    return (profile: mockUser, failure: null);
  }

  @override
  Future<void> logout() async {}
}

void main() {
  late MockProfileRepo mockRepo;
  late GetUserProfileUseCase getUserUseCase;
  late GetPersonalityProfileUseCase getPersonalityUseCase;
  late UpdateUserProfileUseCase updateUseCase;
  late LogoutUserUseCase logoutUseCase;
  late ProfileController controller;

  setUp(() {
    mockRepo = MockProfileRepo();
    getUserUseCase = GetUserProfileUseCase(mockRepo);
    getPersonalityUseCase = GetPersonalityProfileUseCase(mockRepo);
    updateUseCase = UpdateUserProfileUseCase(mockRepo);
    logoutUseCase = LogoutUserUseCase(mockRepo);

    controller = ProfileController(
      getUserProfileUseCase: getUserUseCase,
      getPersonalityProfileUseCase: getPersonalityUseCase,
      updateUserProfileUseCase: updateUseCase,
      logoutUserUseCase: logoutUseCase,
    );
  });

  tearDown(() {
    controller.dispose();
  });

  group('ProfileController Refactored Unit Tests', () {
    test('loadProfile populates state with user identity and Big Five traits', () async {
      await controller.loadProfile();
      expect(controller.state.status, equals(ProfileStatus.data));
      expect(controller.state.userProfile?.displayName, equals('Test User'));
      expect(controller.state.personalityProfile?.openness, equals(0.8));
    });

    test('updateProfile updates state display name', () async {
      await controller.loadProfile();
      final success = await controller.updateProfile('Updated Name');

      expect(success, isTrue);
      expect(controller.state.userProfile?.displayName, equals('Updated Name'));
    });

    test('logout resets profile state', () async {
      await controller.loadProfile();
      await controller.logout();

      expect(controller.state.userProfile, isNull);
    });
  });
}
