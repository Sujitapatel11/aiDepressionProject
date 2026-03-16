import 'package:dio/dio.dart';
import 'secure_storage_service.dart';

class ApiService {
  final Dio _dio;
  final SecureStorageService _secureStorage;
  void Function()? onUnauthenticated;

  ApiService({
    String baseUrl = 'http://10.0.2.2:8000',
    SecureStorageService? secureStorage,
    this.onUnauthenticated,
    Dio? dio,
  })  : _secureStorage = secureStorage ?? SecureStorageService(),
        _dio = dio ?? Dio(BaseOptions(baseUrl: baseUrl)) {
    _dio.interceptors.add(_AuthInterceptor(_secureStorage, _onUnauthorized));
  }

  void _onUnauthorized() {
    onUnauthenticated?.call();
  }

  Future<dynamic> post(String path, Map<String, dynamic> data) async {
    try {
      final response = await _dio.post(path, data: data);
      return response.data;
    } on DioException catch (e) {
      throw _humanReadableError(e);
    }
  }

  Future<dynamic> get(String path) async {
    try {
      final response = await _dio.get(path);
      return response.data;
    } on DioException catch (e) {
      throw _humanReadableError(e);
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      final response = await _dio.delete(path);
      return response.data;
    } on DioException catch (e) {
      throw _humanReadableError(e);
    }
  }

  String _humanReadableError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return 'The request timed out. Please check your connection and try again.';
      case DioExceptionType.connectionError:
        return 'Unable to reach the server. Please check your internet connection.';
      case DioExceptionType.badResponse:
        final status = e.response?.statusCode;
        if (status == 400) return 'Invalid request. Please check your input.';
        if (status == 401) return 'You are not authorised. Please log in again.';
        if (status == 403) return 'You do not have permission to perform this action.';
        if (status == 404) return 'The requested resource was not found.';
        if (status == 500) return 'The server encountered an error. Please try again later.';
        return 'Something went wrong (server error). Please try again.';
      case DioExceptionType.cancel:
        return 'The request was cancelled.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
}

class _AuthInterceptor extends Interceptor {
  final SecureStorageService _secureStorage;
  final void Function() _onUnauthorized;

  _AuthInterceptor(this._secureStorage, this._onUnauthorized);

  @override
  Future<void> onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _secureStorage.readToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401) {
      await _secureStorage.deleteToken();
      _onUnauthorized();
    }
    handler.next(err);
  }
}
