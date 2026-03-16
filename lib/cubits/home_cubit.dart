import 'package:flutter_bloc/flutter_bloc.dart';
import '../services/api_service.dart';
import 'home_state.dart';

class HomeCubit extends Cubit<HomeState> {
  final ApiService _apiService;

  HomeCubit({required ApiService apiService})
      : _apiService = apiService,
        super(const HomeInitial());

  Future<void> loadDashboard() async {
    emit(const HomeLoading());
    try {
      final data = await _apiService.get('/api/dashboard/') as Map<String, dynamic>;
      emit(HomeLoaded(
        pendingRequestCount: (data['pending_request_count'] as num?)?.toInt() ?? 0,
        activeConnectionCount: (data['active_connection_count'] as num?)?.toInt() ?? 0,
        journalEntryCount: (data['journal_entry_count'] as num?)?.toInt() ?? 0,
        latestJournalPreview: data['latest_journal_preview'] as String?,
        unreadInsightCount: (data['unread_insight_count'] as num?)?.toInt() ?? 0,
      ));
    } catch (e) {
      emit(HomeError(message: _humanReadable(e)));
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
