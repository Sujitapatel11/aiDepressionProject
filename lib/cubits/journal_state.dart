import 'package:equatable/equatable.dart';
import '../models/journal_entry.dart';

sealed class JournalState extends Equatable {
  const JournalState();

  @override
  List<Object?> get props => [];
}

final class JournalInitial extends JournalState {
  const JournalInitial();
}

final class JournalLoading extends JournalState {
  const JournalLoading();
}

final class JournalLoaded extends JournalState {
  final List<JournalEntry> entries;

  const JournalLoaded({required this.entries});

  @override
  List<Object?> get props => [entries];
}

final class JournalSaving extends JournalState {
  const JournalSaving();
}

final class JournalSaved extends JournalState {
  const JournalSaved();
}

final class JournalError extends JournalState {
  final String message;
  final String? preservedContent;

  const JournalError({required this.message, this.preservedContent});

  @override
  List<Object?> get props => [message, preservedContent];
}
