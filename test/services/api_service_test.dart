import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:mindspace/services/api_service.dart';
import 'package:mindspace/services/secure_storage_service.dart';

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
// Minimal Dio adapter that records outgoing requests and returns a
// configurable response without touching the network.
// ---------------------------------------------------------------------------
class _FakeAdapter implements HttpClientAdapter {
  final List<RequestOptions> capturedRequests = [];
  int statusCode;
  dynamic responseData;

  _FakeAdapter({this.statusCode = 200, this.responseData = <String, dynamic>{}});

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    capturedRequests.add(options);
    if (statusCode == 401) {
      throw DioException(
        requestOptions: options,
        response: Response(
          requestOptions: options,
          statusCode: 401,
          data: 'Unauthorized',
        ),
        type: DioExceptionType.badResponse,
      );
    }
    return ResponseBody.fromString('{}', statusCode);
  }

  @override
  void close({bool force = false}) {}
}

// ---------------------------------------------------------------------------
// Helper: build an ApiService wired to a fake adapter and fake storage.
// ---------------------------------------------------------------------------
ApiService _buildService({
  required _FakeAdapter adapter,
  required FakeSecureStorageService storage,
  void Function()? onUnauthenticated,
}) {
  final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
  dio.httpClientAdapter = adapter;

  return ApiService(
    dio: dio,
    secureStorage: storage,
    onUnauthenticated: onUnauthenticated,
  );
}

// ---------------------------------------------------------------------------
// Property 5: Every authenticated request carries Bearer token
// Validates: Requirements 1.8
// ---------------------------------------------------------------------------
void main() {
  group('Property 5: Every authenticated request carries Bearer token', () {
    // We test across a variety of token strings to confirm the property holds
    // for any non-null token value.
    final tokens = [
      'simple_token',
      'abc123',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig',
      'token with spaces',
      'a' * 256, // very long token
      '!@#\$%^&*()', // special characters
    ];

    for (final token in tokens) {
      test('GET request with token "$token" includes Authorization header',
          () async {
        final adapter = _FakeAdapter();
        final storage = FakeSecureStorageService(initialToken: token);
        final service = _buildService(adapter: adapter, storage: storage);

        try {
          await service.get('/test');
        } catch (_) {
          // Ignore response parsing; we only care about the request headers.
        }

        expect(adapter.capturedRequests, isNotEmpty);
        final headers = adapter.capturedRequests.last.headers;
        expect(headers['Authorization'], equals('Bearer $token'));
      });

      test('POST request with token "$token" includes Authorization header',
          () async {
        final adapter = _FakeAdapter();
        final storage = FakeSecureStorageService(initialToken: token);
        final service = _buildService(adapter: adapter, storage: storage);

        try {
          await service.post('/test', {'key': 'value'});
        } catch (_) {}

        expect(adapter.capturedRequests, isNotEmpty);
        final headers = adapter.capturedRequests.last.headers;
        expect(headers['Authorization'], equals('Bearer $token'));
      });

      test('DELETE request with token "$token" includes Authorization header',
          () async {
        final adapter = _FakeAdapter();
        final storage = FakeSecureStorageService(initialToken: token);
        final service = _buildService(adapter: adapter, storage: storage);

        try {
          await service.delete('/test');
        } catch (_) {}

        expect(adapter.capturedRequests, isNotEmpty);
        final headers = adapter.capturedRequests.last.headers;
        expect(headers['Authorization'], equals('Bearer $token'));
      });
    }

    test('Request without token does NOT include Authorization header',
        () async {
      final adapter = _FakeAdapter();
      final storage = FakeSecureStorageService(initialToken: null);
      final service = _buildService(adapter: adapter, storage: storage);

      try {
        await service.get('/test');
      } catch (_) {}

      expect(adapter.capturedRequests, isNotEmpty);
      final headers = adapter.capturedRequests.last.headers;
      expect(headers.containsKey('Authorization'), isFalse);
    });
  });

  // ---------------------------------------------------------------------------
  // Property 6: 401 response clears token
  // Validates: Requirements 1.9
  // ---------------------------------------------------------------------------
  group('Property 6: 401 response clears token', () {
    // For any token value, a 401 response must delete the token from storage
    // and invoke the onUnauthenticated callback.
    final tokens = [
      'token_a',
      'token_b',
      'eyJhbGciOiJIUzI1NiJ9.e30.sig',
      'short',
      'a' * 128,
    ];

    for (final token in tokens) {
      test('401 response clears token "$token" from SecureStorage', () async {
        final adapter = _FakeAdapter(statusCode: 401);
        final storage = FakeSecureStorageService(initialToken: token);
        final service = _buildService(adapter: adapter, storage: storage);

        try {
          await service.get('/protected');
        } catch (_) {
          // Expected: a DioException is re-thrown after the interceptor runs.
        }

        expect(await storage.readToken(), isNull,
            reason: 'Token must be deleted after a 401 response');
      });

      test('401 response invokes onUnauthenticated callback for token "$token"',
          () async {
        final adapter = _FakeAdapter(statusCode: 401);
        final storage = FakeSecureStorageService(initialToken: token);
        var callbackInvoked = false;

        final service = _buildService(
          adapter: adapter,
          storage: storage,
          onUnauthenticated: () => callbackInvoked = true,
        );

        try {
          await service.get('/protected');
        } catch (_) {}

        expect(callbackInvoked, isTrue,
            reason: 'onUnauthenticated must be called after a 401 response');
      });
    }

    test('Non-401 error does NOT clear token', () async {
      final adapter = _FakeAdapter(statusCode: 500);
      final storage = FakeSecureStorageService(initialToken: 'keep_me');

      // For a 500 we need the adapter to throw a badResponse DioException
      // without the 401 branch.
      final dio = Dio(BaseOptions(baseUrl: 'http://localhost'));
      dio.httpClientAdapter = _Status500Adapter();

      final service = ApiService(
        dio: dio,
        secureStorage: storage,
      );

      try {
        await service.get('/server-error');
      } catch (_) {}

      expect(await storage.readToken(), equals('keep_me'),
          reason: 'Token must NOT be deleted for non-401 errors');
    });
  });
}

// Adapter that throws a 500 DioException (not 401).
class _Status500Adapter implements HttpClientAdapter {
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    throw DioException(
      requestOptions: options,
      response: Response(
        requestOptions: options,
        statusCode: 500,
        data: 'Internal Server Error',
      ),
      type: DioExceptionType.badResponse,
    );
  }

  @override
  void close({bool force = false}) {}
}
