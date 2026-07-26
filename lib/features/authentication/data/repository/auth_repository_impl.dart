import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/auth_failure.dart';
import '../../domain/entities/auth_tokens_entity.dart';
import '../../domain/repository/auth_repository.dart';
import '../datasource/auth_api_client.dart';
import '../dto/google_auth_request_dto.dart';
import '../dto/login_request_dto.dart';
import '../dto/password_reset_request_dto.dart';
import '../dto/reset_password_confirm_request_dto.dart';
import '../dto/signup_request_dto.dart';

/// Production implementation of AuthRepository with JWT secure storage integration
class AuthRepositoryImpl implements AuthRepository {
  final AuthApiClient apiClient;
  final SecureStorageService secureStorage;

  AuthRepositoryImpl({
    required this.apiClient,
    required this.secureStorage,
  });

  @override
  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> login({
    required String username,
    required String password,
  }) async {
    try {
      final request = LoginRequestDto(username: username, password: password);
      final response = await apiClient.login(request);

      await secureStorage.saveTokens(
        accessToken: response.token,
        refreshToken: response.refresh,
      );
      await secureStorage.saveUserData(
        userId: response.userId,
        username: response.username,
      );

      return (tokens: response.toEntity(), failure: null);
    } on AuthApiException catch (e) {
      return (tokens: null, failure: InvalidCredentialsFailure(e.message));
    } catch (_) {
      return (tokens: null, failure: const NetworkFailure());
    }
  }

  @override
  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> signup({
    required String username,
    required String email,
    required String password,
    required String passwordConfirm,
  }) async {
    try {
      final request = SignupRequestDto(
        username: username,
        email: email,
        password: password,
        passwordConfirm: passwordConfirm,
      );
      final response = await apiClient.signup(request);

      await secureStorage.saveTokens(
        accessToken: response.token,
        refreshToken: response.refresh,
      );
      await secureStorage.saveUserData(
        userId: response.userId,
        username: response.username,
      );

      return (tokens: response.toEntity(), failure: null);
    } on AuthApiException catch (e) {
      return (tokens: null, failure: InvalidCredentialsFailure(e.message));
    } catch (_) {
      return (tokens: null, failure: const NetworkFailure());
    }
  }

  @override
  Future<({AuthTokensEntity? tokens, AuthFailure? failure})> continueWithGoogle({
    required String idToken,
  }) async {
    try {
      final request = GoogleAuthRequestDto(idToken: idToken);
      final response = await apiClient.googleAuth(request);

      await secureStorage.saveTokens(
        accessToken: response.token,
        refreshToken: response.refresh,
      );
      await secureStorage.saveUserData(
        userId: response.userId,
        username: response.username,
      );

      return (tokens: response.toEntity(), failure: null);
    } on AuthApiException catch (e) {
      return (tokens: null, failure: InvalidCredentialsFailure(e.message));
    } catch (_) {
      return (tokens: null, failure: const NetworkFailure());
    }
  }

  @override
  Future<void> logout() async {
    final access = await secureStorage.getAccessToken();
    final refresh = await secureStorage.getRefreshToken();

    if (access != null && refresh != null) {
      try {
        await apiClient.logout(refresh, access);
      } catch (_) {}
    }
    await secureStorage.clearTokens();
  }

  @override
  Future<bool> requestPasswordReset(String email) async {
    try {
      return await apiClient.passwordReset(
        PasswordResetRequestDto(email: email),
      );
    } catch (_) {
      return false;
    }
  }

  @override
  Future<({bool success, AuthFailure? failure})> confirmPasswordReset({
    required String uid,
    required String token,
    required String newPassword,
    required String reNewPassword,
  }) async {
    try {
      final request = ResetPasswordConfirmRequestDto(
        uid: uid,
        token: token,
        newPassword: newPassword,
        reNewPassword: reNewPassword,
      );
      final ok = await apiClient.confirmPasswordReset(request);
      return (success: ok, failure: null);
    } on AuthApiException catch (e) {
      return (success: false, failure: TokenExpiredFailure(e.message));
    } catch (_) {
      return (success: false, failure: const NetworkFailure());
    }
  }

  @override
  Future<String?> getValidAccessToken() async {
    final access = await secureStorage.getAccessToken();
    if (access != null && access.isNotEmpty) return access;

    final refresh = await secureStorage.getRefreshToken();
    if (refresh != null && refresh.isNotEmpty) {
      try {
        final newAccess = await apiClient.refreshToken(refresh);
        await secureStorage.saveTokens(
          accessToken: newAccess,
          refreshToken: refresh,
        );
        return newAccess;
      } catch (_) {
        await secureStorage.clearTokens();
        return null;
      }
    }
    return null;
  }
}
