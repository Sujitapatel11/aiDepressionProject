import 'package:google_sign_in/google_sign_in.dart';
import 'google_auth_service.dart';

/// Production implementation of GoogleAuthService wrapping google_sign_in SDK
class GoogleAuthServiceImpl implements GoogleAuthService {
  final GoogleSignIn _googleSignIn;

  GoogleAuthServiceImpl({GoogleSignIn? googleSignIn})
      : _googleSignIn = googleSignIn ??
            GoogleSignIn(
              scopes: ['email', 'profile'],
            );

  @override
  Future<String?> getGoogleIdToken() async {
    try {
      final account = await _googleSignIn.signIn();
      if (account == null) {
        // User cancelled the Google Sign-In picker
        return null;
      }
      final authentication = await account.authentication;
      return authentication.idToken;
    } catch (_) {
      return null;
    }
  }

  @override
  Future<void> signOut() async {
    try {
      await _googleSignIn.signOut();
    } catch (_) {}
  }
}
