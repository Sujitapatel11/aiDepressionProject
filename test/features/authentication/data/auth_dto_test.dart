import 'package:flutter_test/flutter_test.dart';
import 'package:aiDepressionProject/features/authentication/data/dto/auth_response_dto.dart';
import 'package:aiDepressionProject/data/datasources/auth_remote_datasource.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'dart:convert';

void main() {
  group('AuthResponseDto Unit Tests', () {
    test('fromJson parses login/signup REST payload correctly', () {
      final jsonMap = {
        'token': 'access_token_123',
        'refresh': 'refresh_token_456',
        'user_id': 10,
        'username': 'john_doe',
      };

      final dto = AuthResponseDto.fromJson(jsonMap);
      expect(dto.token, equals('access_token_123'));
      expect(dto.refresh, equals('refresh_token_456'));
      expect(dto.userId, equals(10));
      expect(dto.username, equals('john_doe'));
    });

    test('AuthRemoteDataSourceImpl.signup includes password_confirm parameter', () async {
      late Map<String, dynamic> capturedBody;

      final mockClient = MockClient((request) async {
        capturedBody = jsonDecode(request.body) as Map<String, dynamic>;
        return http.Response(
          jsonEncode({
            'token': 'mock_access',
            'refresh': 'mock_refresh',
            'user_id': 1,
            'username': 'test_user',
          }),
          201,
        );
      });

      final dataSource = AuthRemoteDataSourceImpl(client: mockClient);
      final result = await dataSource.signup(
        username: 'test_user',
        email: 'test@example.com',
        password: 'password123',
      );

      expect(capturedBody['username'], equals('test_user'));
      expect(capturedBody['email'], equals('test@example.com'));
      expect(capturedBody['password'], equals('password123'));
      expect(capturedBody['password_confirm'], equals('password123'));
      expect(result.token, equals('mock_access'));
    });
  });
}
