import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/journal_cubit.dart';
import '../../cubits/journal_state.dart';
import '../../models/journal_entry.dart';
import '../../theme/app_theme.dart';
import 'journal_create_screen.dart';

/// Screen that lists all journal entries in reverse chronological order.
///
/// Requirements: 5.1–5.6
class JournalListScreen extends StatefulWidget {
  const JournalListScreen({super.key});

  @override
  State<JournalListScreen> createState() => _JournalListScreenState();
}

class _JournalListScreenState extends State<JournalListScreen> {
  @override
  void initState() {
    super.initState();
    // Load entries as soon as the screen mounts (Req 5.1)
    context.read<JournalCubit>().loadEntries();
  }

  Future<void> _confirmDelete(BuildContext context, JournalEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete entry?'),
        content: const Text(
          'This entry will be permanently deleted.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: AppTheme.errorColor,
            ),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true && context.mounted) {
      context.read<JournalCubit>().deleteEntry(entry.id);
    }
  }

  String _formatDate(DateTime dt) {
    // Simple readable date: e.g. "12 Jun 2025, 14:30"
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${dt.day} ${months[dt.month - 1]} ${dt.year}, $h:$m';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.backgroundColor,
      appBar: AppBar(
        title: const Text('Journal'),
        backgroundColor: AppTheme.surfaceColor,
      ),
      body: BlocBuilder<JournalCubit, JournalState>(
        builder: (context, state) {
          if (state is JournalLoading) {
            // Loading indicator (Req 5.5)
            return const Center(child: CircularProgressIndicator());
          }

          if (state is JournalError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  state.message,
                  style: AppTheme.bodyMedium.copyWith(
                    color: AppTheme.errorColor,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          if (state is JournalLoaded) {
            if (state.entries.isEmpty) {
              // Empty state (Req 5.6)
              return const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: Text(
                    'No journal entries yet. Start writing!',
                    style: AppTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                ),
              );
            }

            // Entries list — newest first (Req 5.2)
            return ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: state.entries.length,
              itemBuilder: (context, index) {
                final entry = state.entries[index];
                return _JournalCard(
                  entry: entry,
                  formattedDate: _formatDate(entry.createdAt),
                  onDelete: () => _confirmDelete(context, entry),
                );
              },
            );
          }

          // JournalInitial / JournalSaving / JournalSaved — show nothing
          return const SizedBox.shrink();
        },
      ),
      // FAB to navigate to create screen
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => BlocProvider.value(
                value: context.read<JournalCubit>(),
                child: const JournalCreateScreen(),
              ),
            ),
          );
        },
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: AppTheme.onPrimaryColor,
        tooltip: 'New entry',
        child: const Icon(Icons.edit_outlined),
      ),
    );
  }
}

class _JournalCard extends StatelessWidget {
  const _JournalCard({
    required this.entry,
    required this.formattedDate,
    required this.onDelete,
  });

  final JournalEntry entry;
  final String formattedDate;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: AppTheme.cardDecoration,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 8, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Truncated content preview
                  Text(
                    entry.content,
                    style: AppTheme.bodyMedium,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    formattedDate,
                    style: AppTheme.caption,
                  ),
                ],
              ),
            ),
            // Delete icon button (Req 5.3)
            IconButton(
              icon: const Icon(Icons.delete_outline),
              color: AppTheme.errorColor,
              tooltip: 'Delete entry',
              onPressed: onDelete,
            ),
          ],
        ),
      ),
    );
  }
}
