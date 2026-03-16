import 'package:flutter_bloc/flutter_bloc.dart';
import '../models/journal_entry.dart';
import '../services/api_service.dart';
import 'journal_state.dart';

class JournalCubit extends Cubit<JournalState> {
  final ApiService _apiService;

  JournalCubit({required ApiService apiService})
      : _apiService = apiService,
        super(const JournalInitial());

  /// Fetches all journal entries and emits them sorted newest-first.
  Future<void> loadEntries() async {
    emit(const JournalLoading());
    try {
      final data = await _apiService.get('/api/journal/');
      final entries = (data as List<dynamic>)
          .map((e) => JournalEntry.fromJson(e as Map<String, dynamic>))
          .toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
      emit(JournalLoaded(entries: entries));
    } catch (e) {
      emit(JournalError(message: _humanReadable(e)));
    }
  }

  /// Validates and saves a new journal entry.
  ///
  /// Emits [JournalError] immediately (no network call) if [content] is
  /// empty or whitespace-only (Requirement 4.3).
  /// On failure the error state preserves [content] so the user's text is
  /// not lost (Requirement 4.5).
  Future<void> saveEntry(String content) async {
    if (content.trim().isEmpty) {
      emit(JournalError(
        message: 'Journal entry cannot be empty.',
        preservedContent: content,
      ));
      return;
    }

    emit(const JournalSaving());
    try {
      await _apiService.post('/api/journal/', {'content': content});
      emit(const JournalSaved());
    } catch (e) {
      emit(JournalError(message: _humanReadable(e), preservedContent: content));
    }
  }

  /// Deletes the entry with [id] and removes it from the loaded list on
  /// success (Requirement 5.4).
  Future<void> deleteEntry(String id) async {
    try {
      await _apiService.delete('/api/journal/$id/');
      if (state is JournalLoaded) {
        final current = (state as JournalLoaded).entries;
        emit(JournalLoaded(
          entries: current.where((e) => e.id != id).toList(),
        ));
      }
    } catch (e) {
      emit(JournalError(message: _humanReadable(e)));
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
