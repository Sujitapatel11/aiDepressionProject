import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../services/api_service.dart';
import '../services/secure_storage_service.dart';
import 'auth_state.dart';

class AuthCubit extends Cubit<AuthState> {
  final ApiService _apiService;
  final SecureStorageService _secureStorage;
  final GoogleSignIn _googleSignIn;

  AuthCubit({
    required ApiService apiService,
    required SecureStorageService secureStorage,
    GoogleSignIn? googleSignIn,
  })  : _apiService = apiService,
        _secureStorage = secureStorage,
        _googleSignIn = googleSignIn ?? GoogleSignIn(scopes: ['email']),
        super(const AuthInitial());

  Future<void> checkAuthStatus() async {
    final token = await _secureStorage.readToken();
    if (token != null) {
      // We don't have userId cached separately, so emit with empty userId
      // The token presence is sufficient to consider the user authenticated
      emit(AuthAuthenticated(userId: '', token: token));
    } else {
      emit(const AuthUnauthenticated());
    }
  }

  Future<void> login(String username, String password) async {
    emit(const AuthLoading());
    try {
      final response = await _apiService.post('/api/auth/login/', {
        'username': username,
        'password': password,
      });
      final token = response['token'] as String;
      final userId = response['user_id']?.toString() ?? '';
      await _secureStorage.writeToken(token);
      emit(AuthAuthenticated(userId: userId, token: token));
    } catch (e) {
      emit(AuthError(message: _humanReadable(e)));
    }
  }

  Future<void> signup(String username, String password, String confirm) async {
    if (password != confirm) {
      emit(const AuthError(message: 'Passwords do not match.'));
      return;
    }
    emit(const AuthLoading());
    try {
      final response = await _apiService.post('/api/auth/signup/', {
        'username': username,
        'password': password,
      });
      final token = response['token'] as String;
      final userId = response['user_id']?.toString() ?? '';
      await _secureStorage.writeToken(token);
      emit(AuthAuthenticated(userId: userId, token: token));
    } catch (e) {
      emit(AuthError(message: _humanReadable(e)));
    }
  }

  Future<void> loginWithGoogle() async {
    emit(const AuthLoading());
    try {
      final account = await _googleSignIn.signIn();
      if (account == null) {
        // User cancelled the sign-in flow — stay on login, no network call
        emit(const AuthUnauthenticated());
        return;
      }
      final googleAuth = await account.authentication;
      final idToken = googleAuth.idToken;
      if (idToken == null) {
        emit(const AuthError(
            message: 'Google Sign-In failed: could not retrieve token.'));
        return;
      }
      final response = await _apiService.post('/api/auth/google/', {
        'id_token': idToken,
      });
      final token = response['token'] as String;
      final userId = response['user_id']?.toString() ?? '';
      await _secureStorage.writeToken(token);
      emit(AuthAuthenticated(userId: userId, token: token));
    } catch (e) {
      emit(AuthError(message: _humanReadable(e)));
    }
  }

  Future<void> logout() async {
    await _secureStorage.deleteToken();
    emit(const AuthUnauthenticated());
  }

  /// Strips Dart exception class prefixes (e.g. "Exception: ", "StateError: ")
  /// so only the human-readable message is shown.
  String _humanReadable(Object e) {
    final msg = e.toString();
    final colon = msg.indexOf(': ');
    if (colon != -1 && colon < 30) return msg.substring(colon + 2);
    return msg;
  }
}
