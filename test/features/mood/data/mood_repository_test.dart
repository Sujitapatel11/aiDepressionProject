import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/core/storage/secure_storage_service.dart';
import 'package:aiDepressionProject/features/mood/data/datasource/mood_remote_datasource.dart';
import 'package:aiDepressionProject/features/mood/data/dto/mood_entry_dto.dart';
import 'package:aiDepressionProject/features/mood/data/repository/mood_repository_impl.dart';

class MockSecureStorage extends SecureStorageService {
  @override
  Future<String?> getAccessToken() async => 'mock_token_123';
}

class MockMoodRemoteDataSource extends MoodRemoteDataSource {
  bool shouldFail = false;

  MockMoodRemoteDataSource() : super(config: const AppConfig(baseUrl: 'http://localhost'));

  @override
  Future<MoodEntryDto> postMoodCheckIn({
    required String accessToken,
    required String moodState,
    String? note,
  }) async {
    if (shouldFail) throw Exception("Network failure");
    return MoodEntryDto(
      id: 1,
      mood: moodState,
      content: note,
      createdAt: DateTime.now().toIso8601String(),
    );
  }
}

void main() {
  late MockMoodRemoteDataSource mockDs;
  late MockSecureStorage mockStorage;
  late MoodRepositoryImpl repository;

  setUp(() {
    mockDs = MockMoodRemoteDataSource();
    mockStorage = MockSecureStorage();
    repository = MoodRepositoryImpl(
      remoteDataSource: mockDs,
      secureStorage: mockStorage,
    );
  });

  group('MoodRepositoryImpl Unit Tests', () {
    test('submitMoodCheckIn returns entity on success', () async {
      final result = await repository.submitMoodCheckIn(
        moodState: 'Joyful',
        note: 'Feeling fantastic',
      );

      expect(result.failure, isNull);
      expect(result.entry, isNotNull);
      expect(result.entry?.moodState, equals('Joyful'));
    });

    test('submitMoodCheckIn handles network failure cleanly', () async {
      mockDs.shouldFail = true;
      final result = await repository.submitMoodCheckIn(
        moodState: 'Calm',
      );

      expect(result.failure, isNotNull);
    });
  });
}
