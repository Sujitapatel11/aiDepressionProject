import '../../core/network/failure.dart';
import '../../core/storage/secure_storage_service.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_datasource.dart';
import '../models/auth_tokens_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource remoteDataSource;
  final SecureStorageService storageService;

  AuthRepositoryImpl({
    required this.remoteDataSource,
    required this.storageService,
  });

  @override
  Future<({Failure? failure, AuthTokensModel? data})> login({
    required String usernameOrEmail,
    required String password,
  }) async {
    try {
      final result = await remoteDataSource.login(
        usernameOrEmail: usernameOrEmail,
        password: password,
      );

      // Save tokens securely upon successful login
      await storageService.saveAuthData(
        accessToken: result.token,
        refreshToken: result.refresh,
        userId: result.userId,
        username: result.username,
      );

      return (failure: null, data: result);
    } on Failure catch (failure) {
      return (failure: failure, data: null);
    } catch (e) {
      return (failure: UnknownFailure(e.toString()), data: null);
    }
  }

  @override
  Future<({Failure? failure, AuthTokensModel? data})> authenticateWithGoogle({
    required String idToken,
  }) async {
    try {
      final result = await remoteDataSource.authenticateWithGoogle(
        idToken: idToken,
      );

      // Save tokens securely
      await storageService.saveAuthData(
        accessToken: result.token,
        refreshToken: result.refresh,
        userId: result.userId,
        username: result.username,
      );

      return (failure: null, data: result);
    } on Failure catch (failure) {
      return (failure: failure, data: null);
    } catch (e) {
      return (failure: UnknownFailure(e.toString()), data: null);
    }
  }

  @override
  Future<Failure?> requestPasswordReset({
    required String email,
  }) async {
    try {
      await remoteDataSource.requestPasswordReset(email: email);
      return null;
    } on Failure catch (failure) {
      return failure;
    } catch (e) {
      return UnknownFailure(e.toString());
    }
  }
}
