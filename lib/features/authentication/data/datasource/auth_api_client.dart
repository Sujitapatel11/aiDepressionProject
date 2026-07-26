import 'dart:convert';
import 'package:http/http.dart' as http;
import '../../../../core/config/app_config.dart';
import '../../../../core/network/api_endpoints.dart';

import '../dto/auth_response_dto.dart';
import '../dto/google_auth_request_dto.dart';
import '../dto/login_request_dto.dart';
import '../dto/password_reset_request_dto.dart';
import '../dto/reset_password_confirm_request_dto.dart';
import '../dto/signup_request_dto.dart';

/// Exceptions specific to Authentication HTTP API calls
class AuthApiException implements Exception {
  final String message;
  final int? statusCode;

  AuthApiException(this.message, {this.statusCode});

  @override
  String toString() => "AuthApiException: $message (Status: $statusCode)";
}

/// Production Dio/HTTP Auth API Client handling all /api/auth/ endpoints
class AuthApiClient {
  final AppConfig config;
  final http.Client client;

  AuthApiClient({
    required this.config,
    http.Client? client,
  }) : client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Future<AuthResponseDto> login(LoginRequestDto request) async {
    final url = Uri.parse('${config.baseUrl}${ApiEndpoints.login}');
    final response = await client.post(
      url,
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return AuthResponseDto.fromJson(json);
    } else {
      final errorJson = _tryParseJson(response.body);
      final msg = errorJson?['detail'] ?? "Invalid credentials.";
      throw AuthApiException(msg.toString(), statusCode: response.statusCode);
    }
  }

  Future<AuthResponseDto> signup(SignupRequestDto request) async {
    final url = Uri.parse('${config.baseUrl}${ApiEndpoints.signup}');
    final response = await client.post(
      url,
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode == 201) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return AuthResponseDto.fromJson(json);
    } else {
      final errorJson = _tryParseJson(response.body);
      final msg = _extractErrorMessage(errorJson) ?? "Registration failed.";
      throw AuthApiException(msg, statusCode: response.statusCode);
    }
  }

  Future<AuthResponseDto> googleAuth(GoogleAuthRequestDto request) async {
    final url = Uri.parse('${config.baseUrl}${ApiEndpoints.googleAuth}');
    final response = await client.post(
      url,
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return AuthResponseDto.fromJson(json);
    } else {
      final errorJson = _tryParseJson(response.body);
      final msg = errorJson?['detail'] ?? "Google authentication failed.";
      throw AuthApiException(msg.toString(), statusCode: response.statusCode);
    }
  }

  Future<void> logout(String refreshToken, String accessToken) async {
    final url = Uri.parse('${config.baseUrl}${ApiEndpoints.logout}');
    final headers = {
      ..._headers,
      'Authorization': 'Bearer $accessToken',
    };

    await client.post(
      url,
      headers: headers,
      body: jsonEncode({'refresh': refreshToken}),
    );
  }

  Future<bool> passwordReset(PasswordResetRequestDto request) async {
    final url = Uri.parse('${config.baseUrl}${ApiEndpoints.passwordReset}');
    final response = await client.post(
      url,
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );

    return response.statusCode == 200;
  }

  Future<bool> confirmPasswordReset(ResetPasswordConfirmRequestDto request) async {
    final url = Uri.parse('${config.baseUrl}/api/auth/password/reset/confirm/');
    final response = await client.post(
      url,
      headers: _headers,
      body: jsonEncode(request.toJson()),
    );

    if (response.statusCode == 200) {
      return true;
    } else {
      final errorJson = _tryParseJson(response.body);
      final msg = _extractErrorMessage(errorJson) ?? "Invalid or expired reset link.";
      throw AuthApiException(msg, statusCode: response.statusCode);
    }
  }

  Future<String> refreshToken(String refreshToken) async {
    final url = Uri.parse('${config.baseUrl}${ApiEndpoints.refreshToken}');
    final response = await client.post(
      url,
      headers: _headers,
      body: jsonEncode({'refresh': refreshToken}),
    );

    if (response.statusCode == 200) {
      final json = jsonDecode(response.body) as Map<String, dynamic>;
      return json['access'] as String;
    } else {
      throw AuthApiException("Token refresh failed", statusCode: response.statusCode);
    }
  }

  Map<String, dynamic>? _tryParseJson(String body) {
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  String? _extractErrorMessage(Map<String, dynamic>? json) {
    if (json == null) return null;
    if (json.containsKey('detail')) return json['detail'].toString();
    for (var value in json.values) {
      if (value is List && value.isNotEmpty) return value.first.toString();
      if (value is String) return value;
    }
    return null;
  }
}
