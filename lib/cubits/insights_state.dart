import 'package:equatable/equatable.dart';
import '../models/insight.dart';

sealed class InsightsState extends Equatable {
  const InsightsState();

  @override
  List<Object?> get props => [];
}

final class InsightsInitial extends InsightsState {
  const InsightsInitial();
}

final class InsightsLoading extends InsightsState {
  const InsightsLoading();
}

final class InsightsLoaded extends InsightsState {
  final List<Insight> insights;

  const InsightsLoaded({required this.insights});

  @override
  List<Object?> get props => [insights];
}

final class InsightsError extends InsightsState {
  final String message;

  const InsightsError({required this.message});

  @override
  List<Object?> get props => [message];
}
