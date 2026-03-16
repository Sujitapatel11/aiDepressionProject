import 'package:equatable/equatable.dart';
import '../models/support_request.dart';
import '../models/support_connection.dart';
import '../models/user.dart';

sealed class SupportState extends Equatable {
  const SupportState();

  @override
  List<Object?> get props => [];
}

final class SupportInitial extends SupportState {
  const SupportInitial();
}

final class SupportLoading extends SupportState {
  const SupportLoading();
}

final class SupportLoaded extends SupportState {
  final List<SupportRequest> pendingRequests;
  final List<SupportConnection> activeConnections;
  final List<User> availableUsers;

  const SupportLoaded({
    required this.pendingRequests,
    required this.activeConnections,
    required this.availableUsers,
  });

  @override
  List<Object?> get props => [pendingRequests, activeConnections, availableUsers];
}

final class SupportError extends SupportState {
  final String message;

  const SupportError({required this.message});

  @override
  List<Object?> get props => [message];
}
