import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/insight.dart';
import '../services/api_service.dart';
import 'insights_state.dart';

class InsightsCubit extends Cubit<InsightsState> {
  final ApiService _apiService;

  InsightsCubit({required ApiService apiService})
      : _apiService = apiService,
        super(const InsightsInitial());

  /// Fetches all non-dismissed insights and emits them sorted newest-first.
  Future<void> loadInsights() async {
    emit(const InsightsLoading());
    try {
      final data = await _apiService.get('/api/insights/');
      final insights = (data as List<dynamic>)
          .map((e) => Insight.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      emit(InsightsLoaded(insights: insights));
    } catch (e) {
      emit(InsightsError(message: _humanReadable(e)));
    }
  }

  /// Dismisses the insight with [id] and removes it from the loaded list on
  /// success (Requirement 6.4, 6.5).
  Future<void> dismissInsight(String id) async {
    try {
      await _apiService.post('/api/insights/dismiss/$id/', {});
      if (state is InsightsLoaded) {
        final current = (state as InsightsLoaded).insights;
        emit(InsightsLoaded(
          insights: current.where((i) => i.id != id).toList(),
        ));
      }
    } catch (e) {
      emit(InsightsError(message: _humanReadable(e)));
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
