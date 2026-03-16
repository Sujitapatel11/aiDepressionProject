import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/support_request.dart';
import '../models/support_connection.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import 'support_state.dart';

class SupportCubit extends Cubit<SupportState> {
  final ApiService _apiService;

  SupportCubit({required ApiService apiService})
      : _apiService = apiService,
        super(const SupportInitial());

  /// Fetches pending requests, active connections, and available users.
  Future<void> loadSupport() async {
    emit(const SupportLoading());
    try {
      final data = await _apiService.get('/api/support/');
      final map = data as Map<String, dynamic>;

      final pendingRequests = (map['pending_requests'] as List<dynamic>)
          .map((e) => SupportRequest.fromJson(e as Map<String, dynamic>))
          .toList();

      final activeConnections = (map['active_connections'] as List<dynamic>)
          .map((e) => SupportConnection.fromJson(e as Map<String, dynamic>))
          .toList();

      final availableUsers = (map['available_users'] as List<dynamic>)
          .map((e) => User.fromJson(e as Map<String, dynamic>))
          .toList();

      emit(SupportLoaded(
        pendingRequests: pendingRequests,
        activeConnections: activeConnections,
        availableUsers: availableUsers,
      ));
    } catch (e) {
      emit(SupportError(message: _humanReadable(e)));
    }
  }

  /// Sends a support request to [userId].
  ///
  /// Guard: if a pending request to [userId] already exists, emits
  /// [SupportError] without making a network call (Requirement 7.4).
  Future<void> sendRequest(String userId) async {
    if (state is SupportLoaded) {
      final loaded = state as SupportLoaded;
      final alreadyPending = loaded.pendingRequests
          .any((r) => r.toUserId == userId);
      if (alreadyPending) {
        emit(const SupportError(
          message: 'A request to this user is already pending.',
        ));
        return;
      }
    }

    try {
      await _apiService.post('/api/support/send/$userId/', {});
      await loadSupport();
    } catch (e) {
      emit(SupportError(message: _humanReadable(e)));
    }
  }

  /// Accepts the incoming support request with [requestId].
  Future<void> acceptRequest(String requestId) async {
    try {
      await _apiService.post('/api/support/accept/$requestId/', {});
      await loadSupport();
    } catch (e) {
      emit(SupportError(message: _humanReadable(e)));
    }
  }

  /// Rejects the incoming support request with [requestId].
  Future<void> rejectRequest(String requestId) async {
    try {
      await _apiService.post('/api/support/reject/$requestId/', {});
      await loadSupport();
    } catch (e) {
      emit(SupportError(message: _humanReadable(e)));
    }
  }

  /// Strips Dart exception class prefixes so only the human-readable message
  /// is shown (Requirement 11.5).
  String _humanReadable(Object e) {
    final msg = e.toString();
    final colon = msg.indexOf(': ');
    if (colon != -1 && colon < 30) return msg.substring(colon + 2);
    return msg;
  }
}
