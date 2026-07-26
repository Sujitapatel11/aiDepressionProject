import 'package:flutter/foundation.dart';
import '../../../../core/storage/secure_storage_service.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repository/auth_repository.dart';
import '../state/auth_state.dart';

/// Session Manager orchestrating global login status, auto-check, and logout
class SessionManager extends ChangeNotifier {
  final AuthRepository repository;
  final SecureStorageService secureStorage;

  AuthState _state = const AuthState();
  AuthState get state => _state;

  SessionManager({
    required this.repository,
    required this.secureStorage,
  });

  Future<void> checkSession() async {
    _state = _state.copyWith(status: AuthStatus.loading);
    notifyListeners();

    final token = await repository.getValidAccessToken();
    if (token != null) {
      final userId = await secureStorage.getUserId();
      final username = await secureStorage.getUsername();

      _state = _state.copyWith(
        status: AuthStatus.authenticated,
        user: UserEntity(
          id: userId ?? 0,
          username: username ?? 'User',
          email: '',
        ),
      );
    } else {
      _state = _state.copyWith(status: AuthStatus.unauthenticated);
    }
    notifyListeners();
  }

  Future<void> logout() async {
    _state = _state.copyWith(status: AuthStatus.loading);
    notifyListeners();

    await repository.logout();

    _state = const AuthState(status: AuthStatus.unauthenticated);
    notifyListeners();
  }
}
