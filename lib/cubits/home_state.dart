import 'package:equatable/equatable.dart';

sealed class HomeState extends Equatable {
  const HomeState();

  @override
  List<Object?> get props => [];
}

final class HomeInitial extends HomeState {
  const HomeInitial();
}

final class HomeLoading extends HomeState {
  const HomeLoading();
}

final class HomeLoaded extends HomeState {
  final int pendingRequestCount;
  final int activeConnectionCount;
  final int journalEntryCount;
  final String? latestJournalPreview;
  final int unreadInsightCount;

  const HomeLoaded({
    required this.pendingRequestCount,
    required this.activeConnectionCount,
    required this.journalEntryCount,
    this.latestJournalPreview,
    required this.unreadInsightCount,
  });

  @override
  List<Object?> get props => [
        pendingRequestCount,
        activeConnectionCount,
        journalEntryCount,
        latestJournalPreview,
        unreadInsightCount,
      ];
}

final class HomeError extends HomeState {
  final String message;

  const HomeError({required this.message});

  @override
  List<Object?> get props => [message];
}
