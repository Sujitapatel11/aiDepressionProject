import '../../domain/entities/journal_entry_entity.dart';
import '../../domain/entities/journal_failure.dart';

enum JournalListStatus {
  initial,
  loading,
  data,
  empty,
  error,
  offline,
  refreshing,
}

/// Immutable state container for Journal timeline list screen
class JournalListState {
  final JournalListStatus status;
  final List<JournalEntryEntity> entries;
  final List<JournalEntryEntity> filteredEntries;
  final JournalFailure? failure;
  final String searchQuery;
  final String? selectedMoodFilter;
  final bool isOffline;

  const JournalListState({
    this.status = JournalListStatus.initial,
    this.entries = const [],
    this.filteredEntries = const [],
    this.failure,
    this.searchQuery = '',
    this.selectedMoodFilter,
    this.isOffline = false,
  });

  bool get isLoading => status == JournalListStatus.loading;
  bool get isRefreshing => status == JournalListStatus.refreshing;
  bool get isEmpty => (status == JournalListStatus.empty) || (status == JournalListStatus.data && filteredEntries.isEmpty);
  bool get isError => status == JournalListStatus.error;
  bool get hasData => entries.isNotEmpty;

  JournalListState copyWith({
    JournalListStatus? status,
    List<JournalEntryEntity>? entries,
    List<JournalEntryEntity>? filteredEntries,
    JournalFailure? failure,
    String? searchQuery,
    String? selectedMoodFilter,
    bool? isOffline,
  }) {
    return JournalListState(
      status: status ?? this.status,
      entries: entries ?? this.entries,
      filteredEntries: filteredEntries ?? this.filteredEntries,
      failure: failure ?? this.failure,
      searchQuery: searchQuery ?? this.searchQuery,
      selectedMoodFilter: selectedMoodFilter ?? this.selectedMoodFilter,
      isOffline: isOffline ?? this.isOffline,
    );
  }
}
