import '../state/auth_state.dart';

/// Helper for GoRouter declarative auth guard redirect logic
class AuthGuard {
  static String? redirectGuard({
    required AuthState authState,
    required String currentRoute,
  }) {
    final isAuthenticated = authState.isAuthenticated;
    final isAuthRoute = currentRoute == '/login' ||
        currentRoute == '/signup' ||
        currentRoute == '/onboarding';

    if (!isAuthenticated && !isAuthRoute) {
      return '/login';
    }

    if (isAuthenticated && isAuthRoute) {
      return '/dashboard';
    }

    return null; // No redirect required
  }
}
