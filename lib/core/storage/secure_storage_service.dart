import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Secure Storage Service wrapper utilizing OS Keychain (iOS) & EncryptedSharedPreferences (Android).
class SecureStorageService {
  final FlutterSecureStorage _storage;

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  static const String _keyAccessToken = "soulcare_jwt_access_token";
  static const String _keyRefreshToken = "soulcare_jwt_refresh_token";
  static const String _keyUserId = "soulcare_user_id";
  static const String _keyUsername = "soulcare_username";

  /// Save JWT tokens & user info securely
  Future<void> saveAuthData({
    required String accessToken,
    required String refreshToken,
    required int userId,
    required String username,
  }) async {
    await _storage.write(key: _keyAccessToken, value: accessToken);
    await _storage.write(key: _keyRefreshToken, value: refreshToken);
    await _storage.write(key: _keyUserId, value: userId.toString());
    await _storage.write(key: _keyUsername, value: username);
  }

  /// Retrieve stored Access Token
  Future<String?> getAccessToken() async {
    return await _storage.read(key: _keyAccessToken);
  }

  /// Retrieve stored Refresh Token
  Future<String?> getRefreshToken() async {
    return await _storage.read(key: _keyRefreshToken);
  }

  /// Clear all stored credentials on logout
  Future<void> clearAuthData() async {
    await _storage.delete(key: _keyAccessToken);
    await _storage.delete(key: _keyRefreshToken);
    await _storage.delete(key: _keyUserId);
    await _storage.delete(key: _keyUsername);
  }
}
