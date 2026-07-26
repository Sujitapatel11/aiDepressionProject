import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/core/storage/secure_storage_service.dart';
import 'package:aiDepressionProject/features/authentication/domain/entities/auth_failure.dart';
import 'package:aiDepressionProject/features/authentication/domain/entities/auth_tokens_entity.dart';
import 'package:aiDepressionProject/features/authentication/domain/entities/auth_user_entity.dart';
import 'package:aiDepressionProject/features/authentication/domain/repository/auth_repository.dart';
import 'package:aiDepressionProject/features/authentication/presentation/controllers/session_manager.dart';

class MockSecureStorage implements SecureStorageService {
  final Map<String, String> _data = {};

  @override
  Future<void> write({required String key, required String value}) async {
    _data[key] = value;
  }

  @override
  Future<String?> read({required String key}) async {
    return _data[key];
  }

  @override
  Future<void> delete({required String key}) async {
    _data.remove(key);
  }

  @override
  Future<void> deleteAll() async {
    _data.clear();
  }

  @override
  Future<String?> getAccessToken() async => _data['KEY_ACCESS_TOKEN'];

  @override
  Future<bool> hasValidSession() async => _data.containsKey('KEY_ACCESS_TOKEN');

  @override
  Future<void> saveTokens({required String accessToken, required String refreshToken}) async {
    _data['KEY_ACCESS_TOKEN'] = accessToken;
    _data['KEY_REFRESH_TOKEN'] = refreshToken;
  }
}

class MockAuthRepo implements AuthRepository {
  @override
  Future<({AuthTokensEntity? tokens, AuthUserEntity? user, AuthFailure? failure})> login({
    required String username,
    required String password,
  }) async {
    return (
      tokens: const AuthTokensEntity(accessToken: 'acc_123', refreshToken: 'ref_456'),
      user: const AuthUserEntity(id: 1, username: 'test_user', email: 'test@example.com'),
      failure: null
    );
  }

  @override
  Future<({bool success, AuthFailure? failure})> logout({required String refreshToken}) async {
    return (success: true, failure: null);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  test('SessionManager logs in and persists session tokens', () async {
    final storage = MockSecureStorage();
    final repo = MockAuthRepo();
    final manager = SessionManager(repository: repo, secureStorage: storage);

    final success = await manager.login(username: 'test_user', password: 'password123');

    expect(success, isTrue);
    expect(await storage.getAccessToken(), equals('acc_123'));
  });
}
