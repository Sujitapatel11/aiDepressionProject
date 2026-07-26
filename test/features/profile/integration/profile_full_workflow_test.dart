import 'package:flutter/material.dart';
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
import 'package:aiDepressionProject/features/profile/presentation/screens/profile_screen.dart';

class MockWorkflowProfileRepo implements ProfileRepository {
  @override
  Future<({UserProfileEntity? profile, ProfileFailure? failure})> getUserProfile() async {
    return (
      profile: const UserProfileEntity(
        id: 1,
        username: 'sam_member',
        email: 'sam@soulcare.app',
        displayName: 'Sam Member',
      ),
      failure: null
    );
  }

  @override
  Future<({PersonalityProfileEntity? personality, ProfileFailure? failure})> getPersonalityProfile() async {
    return (
      personality: const PersonalityProfileEntity(
        openness: 0.8,
        hasData: true,
      ),
      failure: null
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  testWidgets('Full Profile Workflow Integration Test', (tester) async {
    final mockRepo = MockWorkflowProfileRepo();
    final controller = ProfileController(
      getUserProfileUseCase: GetUserProfileUseCase(mockRepo),
      getPersonalityProfileUseCase: GetPersonalityProfileUseCase(mockRepo),
      updateUserProfileUseCase: UpdateUserProfileUseCase(mockRepo),
      logoutUserUseCase: LogoutUserUseCase(mockRepo),
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ProfileScreen(controller: controller),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Profile & Settings'), findsOneWidget);
    expect(find.text('Sam Member'), findsOneWidget);
    expect(find.text('sam@soulcare.app'), findsOneWidget);
    expect(find.text('BIG FIVE PERSONALITY METRICS'), findsOneWidget);
    expect(find.text('Log Out Session'), findsOneWidget);
  });
}
