import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/authentication/domain/entities/auth_tokens_entity.dart';
import 'package:aiDepressionProject/features/authentication/domain/entities/auth_user_entity.dart';

void main() {
  group('Auth Entities Unit Tests', () {
    test('AuthUserEntity and AuthTokensEntity store credentials safely', () {
      const user = AuthUserEntity(
        id: 1,
        username: 'sam_soulcare',
        email: 'sam@soulcare.app',
      );

      const tokens = AuthTokensEntity(
        accessToken: 'acc_123',
        refreshToken: 'ref_456',
      );

      expect(user.id, equals(1));
      expect(user.username, equals('sam_soulcare'));
      expect(tokens.accessToken, equals('acc_123'));
    });
  });
}
