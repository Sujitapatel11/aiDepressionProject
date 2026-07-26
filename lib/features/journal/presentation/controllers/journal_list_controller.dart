import 'package:flutter/foundation.dart';
import '../../domain/entities/journal_entry_entity.dart';
import '../../domain/usecases/delete_journal_usecase.dart';
import '../../domain/usecases/get_journals_usecase.dart';
import '../state/journal_list_state.dart';

/// Presentation controller exposing state and standardized timeline actions: loadTimeline(), refresh(), search(), filter(), delete()
class JournalListController extends ChangeNotifier {
  final GetJournalsUseCase getJournalsUseCase;
  final DeleteJournalUseCase deleteJournalUseCase;

  JournalListState _state = const JournalListState();
  JournalListState get state => _state;

  JournalListController({
    required this.getJournalsUseCase,
    required this.deleteJournalUseCase,
  });

  /// Action: Loads chronological timeline of reflections
  Future<void> loadTimeline() async {
    if (!_state.hasData) {
      _state = _state.copyWith(status: JournalListStatus.loading);
      notifyListeners();
    }

    final result = await getJournalsUseCase.execute();

    if (result.failure != null) {
      final entries = result.entries ?? _state.entries;
      final isOffline = entries.isNotEmpty;
      _state = _state.copyWith(
        status: isOffline ? JournalListStatus.data : JournalListStatus.error,
        entries: entries,
        filteredEntries: _applyFilters(entries, _state.searchQuery, _state.selectedMoodFilter),
        failure: result.failure,
        isOffline: isOffline,
      );
    } else {
      final entries = result.entries ?? [];
      _state = _state.copyWith(
        status: entries.isEmpty ? JournalListStatus.empty : JournalListStatus.data,
        entries: entries,
        filteredEntries: _applyFilters(entries, _state.searchQuery, _state.selectedMoodFilter),
        failure: null,
        isOffline: false,
      );
    }
    notifyListeners();
  }

  /// Action: Pull-to-refresh timeline handler
  Future<void> refresh() async {
    _state = _state.copyWith(status: JournalListStatus.refreshing);
    notifyListeners();
    await loadTimeline();
  }

  /// Action: Filters timeline list by text search query
  void search(String query) {
    final filtered = _applyFilters(_state.entries, query, _state.selectedMoodFilter);
    _state = _state.copyWith(
      searchQuery: query,
      filteredEntries: filtered,
    );
    notifyListeners();
  }

  /// Action: Filters timeline list by mood tag chip
  void filter(String? moodFilter) {
    final newMoodFilter = _state.selectedMoodFilter == moodFilter ? null : moodFilter;
    final filtered = _applyFilters(_state.entries, _state.searchQuery, newMoodFilter);
    _state = _state.copyWith(
      selectedMoodFilter: newMoodFilter,
      filteredEntries: filtered,
    );
    notifyListeners();
  }

  /// Action: Soft-deletes a reflection entry
  Future<bool> delete(int journalId) async {
    final result = await deleteJournalUseCase.execute(journalId);
    if (result.success) {
      final updatedEntries = List<JournalEntryEntity>.from(_state.entries)
        ..removeWhere((e) => e.journalId == journalId);

      _state = _state.copyWith(
        entries: updatedEntries,
        filteredEntries: _applyFilters(updatedEntries, _state.searchQuery, _state.selectedMoodFilter),
        status: updatedEntries.isEmpty ? JournalListStatus.empty : JournalListStatus.data,
      );
      notifyListeners();
      return true;
    }
    return false;
  }

  List<JournalEntryEntity> _applyFilters(
    List<JournalEntryEntity> list,
    String query,
    String? moodFilter,
  ) {
    return list.where((item) {
      final matchesQuery = query.trim().isEmpty ||
          item.content.toLowerCase().contains(query.trim().toLowerCase());
      final matchesMood = moodFilter == null ||
          moodFilter.isEmpty ||
          (item.moodState != null && item.moodState!.toLowerCase() == moodFilter.toLowerCase());
      return matchesQuery && matchesMood;
    }).toList();
  }
}
