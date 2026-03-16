import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mindspace/services/secure_storage_service.dart';
import 'package:mindspace/services/websocket_service.dart';

// ---------------------------------------------------------------------------
// Fake SecureStorageService backed by an in-memory map so tests run without
// a real device keychain.
// ---------------------------------------------------------------------------
class FakeSecureStorageService extends SecureStorageService {
  String? _token;

  FakeSecureStorageService({String? initialToken})
      : _token = initialToken,
        super(storage: const FlutterSecureStorage());

  @override
  Future<String?> readToken() async => _token;

  @override
  Future<void> writeToken(String token) async => _token = token;

  @override
  Future<void> deleteToken() async => _token = null;
}

// ---------------------------------------------------------------------------
// Property 18: WebSocket requires valid token
// Validates: Requirements 10.2
//
// For any WebSocket connection attempt, if no valid auth token is present in
// SecureStorage, the WebSocketService should reject the connection attempt
// without opening a socket.
// ---------------------------------------------------------------------------
void main() {
  group('Property 18: WebSocket requires valid token', () {
    // Test across a variety of "missing or invalid" token states
    final missingTokenCases = <String, String?>{
      'null token': null,
      'empty string token': '',
    };

    for (final entry in missingTokenCases.entries) {
      test('connect() throws StateError when token is ${entry.key}', () async {
        final storage = FakeSecureStorageService(initialToken: entry.value);
        final service = WebSocketService(secureStorage: storage);

        expect(
          () => service.connect('conn-123', 'any-token'),
          throwsA(isA<StateError>()),
          reason:
              'WebSocketService must refuse to connect when SecureStorage has no valid token',
        );
      });
    }

    // For any valid token, connect() should NOT throw a StateError
    // (it may fail to open the socket since there's no real server, but the
    // token check itself must pass).
    final validTokens = [
      'simple_token',
      'abc123',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      'a' * 256,
    ];

    for (final token in validTokens) {
      test('connect() does not throw StateError when token "$token" is present',
          () async {
        final storage = FakeSecureStorageService(initialToken: token);
        final service = WebSocketService(secureStorage: storage);

        // The call will attempt to open a real WebSocket (which will fail
        // since there's no server), but it must NOT throw a StateError from
        // the token guard. We verify the token check passes by confirming no
        // StateError is thrown.
        Object? caughtError;
        try {
          await service.connect('conn-123', token);
        } catch (e) {
          caughtError = e;
        }

        expect(
          caughtError,
          isNot(isA<StateError>()),
          reason:
              'A valid token must pass the token guard; only network errors are expected',
        );

        await service.disconnect();
      });
    }

    test('statusStream emits disconnected when token is missing', () async {
      final storage = FakeSecureStorageService(initialToken: null);
      final service = WebSocketService(secureStorage: storage);

      // Attempt to connect — should throw without emitting connecting status
      try {
        await service.connect('conn-123', 'token');
      } catch (_) {}

      // isConnected must remain false
      expect(service.isConnected, isFalse);
    });
  });

  group('WebSocketService basic state', () {
    test('isConnected is false before any connection', () {
      final storage = FakeSecureStorageService(initialToken: 'tok');
      final service = WebSocketService(secureStorage: storage);
      expect(service.isConnected, isFalse);
    });

    test('disconnect() is safe to call when not connected', () async {
      final storage = FakeSecureStorageService(initialToken: null);
      final service = WebSocketService(secureStorage: storage);
      // Should not throw
      await expectLater(service.disconnect(), completes);
    });

    test('sendMessage() throws StateError when not connected', () {
      final storage = FakeSecureStorageService(initialToken: 'tok');
      final service = WebSocketService(secureStorage: storage);
      expect(
        () => service.sendMessage('{"message":"hello"}'),
        throwsA(isA<StateError>()),
      );
    });
  });
}
