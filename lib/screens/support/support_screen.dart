import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/support_cubit.dart';
import '../../cubits/support_state.dart';
import '../../models/support_connection.dart';
import '../../models/support_request.dart';
import '../../models/user.dart';
import '../../theme/app_theme.dart';

class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  @override
  void initState() {
    super.initState();
    context.read<SupportCubit>().loadSupport();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Support')),
      body: BlocBuilder<SupportCubit, SupportState>(
        builder: (context, state) {
          if (state is SupportLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is SupportError) {
            return _ErrorView(
              message: state.message,
              onRetry: () => context.read<SupportCubit>().loadSupport(),
            );
          }

          if (state is SupportLoaded) {
            return _LoadedView(state: state);
          }

          // SupportInitial — show nothing until first load
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

// ── Error view ────────────────────────────────────────────────────────────────

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              message,
              style: AppTheme.bodyMedium.copyWith(color: AppTheme.errorColor),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: onRetry,
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Loaded view ───────────────────────────────────────────────────────────────

class _LoadedView extends StatelessWidget {
  const _LoadedView({required this.state});

  final SupportLoaded state;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(vertical: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _SectionHeader(title: 'Incoming Requests'),
          if (state.pendingRequests.isEmpty)
            _EmptyState(message: 'No incoming requests.')
          else
            ...state.pendingRequests.map(
              (r) => _PendingRequestCard(request: r),
            ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'Active Connections'),
          if (state.activeConnections.isEmpty)
            _EmptyState(message: 'No active connections yet.')
          else
            ...state.activeConnections.map(
              (c) => _ConnectionCard(connection: c),
            ),
          const SizedBox(height: 8),
          _SectionHeader(title: 'Find Support'),
          if (state.availableUsers.isEmpty)
            _EmptyState(message: 'No users available right now.')
          else
            ...state.availableUsers.map(
              (u) => _AvailableUserCard(user: u),
            ),
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

// ── Section header ────────────────────────────────────────────────────────────

class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
      child: Text(title, style: AppTheme.headlineSmall),
    );
  }
}

// ── Empty state ───────────────────────────────────────────────────────────────

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(message, style: AppTheme.bodySmall),
    );
  }
}

// ── Pending request card ──────────────────────────────────────────────────────

class _PendingRequestCard extends StatelessWidget {
  const _PendingRequestCard({required this.request});

  final SupportRequest request;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<SupportCubit>();
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Text(
                'Request from user ${request.fromUserId}',
                style: AppTheme.bodyMedium,
              ),
            ),
            TextButton(
              onPressed: () => cubit.acceptRequest(request.id),
              child: const Text('Accept'),
            ),
            TextButton(
              style: TextButton.styleFrom(
                foregroundColor: AppTheme.errorColor,
              ),
              onPressed: () => cubit.rejectRequest(request.id),
              child: const Text('Reject'),
            ),
          ],
        ),
      ),
    );
  }
}

// ── Active connection card ────────────────────────────────────────────────────

class _ConnectionCard extends StatelessWidget {
  const _ConnectionCard({required this.connection});

  final SupportConnection connection;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            const Icon(Icons.person, color: AppTheme.secondaryColor),
            const SizedBox(width: 12),
            // Requirement 10.4: display peerAlias, NOT real username
            Text(connection.peerAlias, style: AppTheme.bodyLarge),
          ],
        ),
      ),
    );
  }
}

// ── Available user card ───────────────────────────────────────────────────────

class _AvailableUserCard extends StatelessWidget {
  const _AvailableUserCard({required this.user});

  final User user;

  @override
  Widget build(BuildContext context) {
    final cubit = context.read<SupportCubit>();
    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Expanded(
              child: Text(user.username, style: AppTheme.bodyMedium),
            ),
            ElevatedButton(
              onPressed: () => cubit.sendRequest(user.id),
              child: const Text('Send Request'),
            ),
          ],
        ),
      ),
    );
  }
}
