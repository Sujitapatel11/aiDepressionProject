import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../cubits/home_cubit.dart';
import '../../cubits/home_state.dart';
import '../../theme/app_theme.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  @override
  void initState() {
    super.initState();
    context.read<HomeCubit>().loadDashboard();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('MindSpace'),
      ),
      body: BlocBuilder<HomeCubit, HomeState>(
        builder: (context, state) {
          if (state is HomeLoading || state is HomeInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is HomeError) {
            return _ErrorView(
              message: state.message,
              onRetry: () => context.read<HomeCubit>().loadDashboard(),
            );
          }
          if (state is HomeLoaded) {
            return _DashboardView(state: state);
          }
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
            Icon(Icons.error_outline, size: 48, color: AppTheme.errorColor),
            const SizedBox(height: 16),
            Text(
              message,
              style: AppTheme.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
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

// ── Dashboard view ────────────────────────────────────────────────────────────

class _DashboardView extends StatelessWidget {
  const _DashboardView({required this.state});

  final HomeLoaded state;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Greeting
          Text('Hello, MindSpace', style: AppTheme.headlineLarge),
          const SizedBox(height: 4),
          Text(
            'Here\'s your wellness overview.',
            style: AppTheme.bodyMedium.copyWith(color: const Color(0xFF616161)),
          ),
          const SizedBox(height: 24),

          // Summary cards
          _SummaryCard(
            icon: Icons.inbox_outlined,
            label: 'Pending Support Requests',
            value: '${state.pendingRequestCount}',
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 12),
          _SummaryCard(
            icon: Icons.people_outline,
            label: 'Active Connections',
            value: '${state.activeConnectionCount}',
            color: AppTheme.secondaryColor,
          ),
          const SizedBox(height: 12),
          _SummaryCard(
            icon: Icons.book_outlined,
            label: 'Journal Entries',
            value: '${state.journalEntryCount}',
            color: AppTheme.primaryColor,
          ),
          const SizedBox(height: 12),
          _SummaryCard(
            icon: Icons.lightbulb_outline,
            label: 'Unread Insights',
            value: '${state.unreadInsightCount}',
            color: AppTheme.secondaryColor,
          ),

          // Latest journal preview
          if (state.latestJournalPreview != null) ...[
            const SizedBox(height: 12),
            _JournalPreviewCard(preview: state.latestJournalPreview!),
          ],

          const SizedBox(height: 28),

          // Quick actions
          Text('Quick Actions', style: AppTheme.headlineSmall),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.of(context).pushNamed('/journal/create'),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Write Journal'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _switchToInsightsTab(context),
                  icon: const Icon(Icons.lightbulb_outline),
                  label: const Text('View Insights'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _switchToInsightsTab(BuildContext context) {
    // The insights tab is index 2 in MainShell's IndexedStack.
    // Walk up to find the nearest Scaffold that owns the BottomNavigationBar
    // and trigger a tab switch via the shell's state.
    // Since MainShell manages its own state, we use a simple Navigator pop
    // or rely on the parent shell. Here we use a named route approach:
    // navigate to the insights tab by popping to root and switching index.
    // For simplicity, we push the insights route if available, otherwise
    // we rely on the shell's tab index being managed externally.
    Navigator.of(context).pushNamed('/insights');
  }
}

// ── Summary card ──────────────────────────────────────────────────────────────

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Text(label, style: AppTheme.bodyMedium),
          ),
          Text(
            value,
            style: AppTheme.headlineSmall.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}

// ── Latest journal preview card ───────────────────────────────────────────────

class _JournalPreviewCard extends StatelessWidget {
  const _JournalPreviewCard({required this.preview});

  final String preview;

  @override
  Widget build(BuildContext context) {
    const maxChars = 120;
    final truncated = preview.length > maxChars
        ? '${preview.substring(0, maxChars)}…'
        : preview;

    return Container(
      decoration: AppTheme.cardDecoration,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(Icons.notes, size: 18, color: AppTheme.primaryColor),
              const SizedBox(width: 8),
              Text('Latest Journal Entry', style: AppTheme.bodySmall),
            ],
          ),
          const SizedBox(height: 8),
          Text(truncated, style: AppTheme.bodyMedium),
        ],
      ),
    );
  }
}
