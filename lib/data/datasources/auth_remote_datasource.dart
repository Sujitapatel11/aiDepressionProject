import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../core/config/app_config.dart';
import '../../core/network/api_endpoints.dart';
import '../../core/network/failure.dart';
import '../models/auth_tokens_model.dart';

import '../../core/network/ssl_pinning_client.dart';

abstract class AuthRemoteDataSource {
  Future<AuthTokensModel> signup({
    required String username,
    required String email,
    required String password,
  });

  Future<AuthTokensModel> login({
    required String emailOrUsername,
    required String password,
  });

  Future<AuthTokensModel> loginWithGoogle(String idToken);

  Future<void> logout(String refreshToken);

  Future<void> sendPasswordResetEmail(String email);
}

class AuthRemoteDataSourceImpl implements AuthRemoteDataSource {
  final http.Client client;
  final AppConfig config;

  AuthRemoteDataSourceImpl({
    http.Client? client,
    this.config = AppConfig.dev,
  }) : client = client ?? SslPinningClient.createClient(config);

  @override
  Future<AuthTokensModel> signup({
    required String username,
    required String email,
    required String password,
  }) async {
    final Uri url = Uri.parse("${config.apiBaseUrl}${ApiEndpoints.signup}");

    try {
      final response = await client
          .post(
            url,
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({
              "username": username,
              "email": email,
              "password": password,
              "password_confirm": password,
            }),
          )
          .timeout(config.apiTimeout);

      return _parseTokenResponse(response);
    } on SocketException {
      throw const NetworkFailure("No internet connection");
    } on TimeoutException {
      throw const TimeoutFailure("Connection timed out. Please try again.");
    } on FormatException {
      throw const UnknownFailure("Invalid server response format.");
    } catch (e) {
      if (e is Failure) rethrow;
      throw UnknownFailure(e.toString());
    }
  }

  @override
  Future<AuthTokensModel> login({
    required String usernameOrEmail,
    required String password,
  }) async {
    final Uri url = Uri.parse("${config.apiBaseUrl}${ApiEndpoints.login}");

    try {
      final response = await client
          .post(
            url,
            headers: {"Content-Type": "application/json"},

            body: jsonEncode({
              "username": usernameOrEmail,
              "password": password,
            }),
          )
          .timeout(config.apiTimeout);

      return _parseTokenResponse(response);
    } on SocketException {
      throw const NetworkFailure("No internet connection");
    } on TimeoutException {
      throw const TimeoutFailure("Connection timed out. Please try again.");
    } on FormatException {
      throw const UnknownFailure("Invalid server response format.");
    } catch (e) {
      if (e is Failure) rethrow;
      throw UnknownFailure(e.toString());
    }
  }

  @override
  Future<AuthTokensModel> authenticateWithGoogle({
    required String idToken,
  }) async {
    final Uri url = Uri.parse("${config.apiBaseUrl}${ApiEndpoints.googleAuth}");

    try {
      final response = await client
          .post(
            url,
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({
              "id_token": idToken,
            }),
          )
          .timeout(config.apiTimeout);

      return _parseTokenResponse(response);
    } on SocketException {
      throw const NetworkFailure("No internet connection");
    } on TimeoutException {
      throw const TimeoutFailure("Connection timed out. Please try again.");
    } catch (e) {
      if (e is Failure) rethrow;
      throw UnknownFailure(e.toString());
    }
  }

  @override
  Future<void> requestPasswordReset({
    required String email,
  }) async {
    final Uri url = Uri.parse("${config.apiBaseUrl}${ApiEndpoints.passwordReset}");

    try {
      final response = await client
          .post(
            url,
            headers: {"Content-Type": "application/json"},
            body: jsonEncode({
              "email": email,
            }),
          )
          .timeout(config.apiTimeout);

      if (response.statusCode >= 500) {
        throw const ServerFailure();
      }
    } on SocketException {
      throw const NetworkFailure("No internet connection");
    } on TimeoutException {
      throw const TimeoutFailure("Connection timed out. Please try again.");
    } catch (e) {
      if (e is Failure) rethrow;
      throw UnknownFailure(e.toString());
    }
  }

  /// Parse response status codes according to backend contracts
  AuthTokensModel _parseTokenResponse(http.Response response) {
    final int code = response.statusCode;

    if (code >= 200 && code < 300) {
      final Map<String, dynamic> jsonMap = jsonDecode(response.body);
      return AuthTokensModel.fromJson(jsonMap);
    } else if (code == 400 || code == 401) {
      throw const InvalidCredentialsFailure("Invalid email or password");
    } else if (code == 429) {
      throw const RateLimitFailure("Too many login attempts. Please try again later.");
    } else if (code >= 500) {
      throw const ServerFailure("Server unavailable. Please try again later.");
    } else {
      throw ServerFailure("HTTP $code: Server unavailable. Please try again later.");
    }
  }
}
