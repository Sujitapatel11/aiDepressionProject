import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../domain/entities/journal_entry_entity.dart';
import '../widgets/journal_delete_dialog.dart';

/// Screen displaying single journal reflection details with Edit and Delete options
class JournalDetailScreen extends StatelessWidget {
  final JournalEntryEntity entry;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const JournalDetailScreen({
    Key? key,
    required this.entry,
    this.onEdit,
    this.onDelete,
  }) : super(key: key);

  String _formatTimestamp(DateTime dt) {
    return DateFormat('MMMM d, y • h:mm a').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      appBar: AppBar(
        title: const Text(
          "Reflection Detail",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_outlined),
            onPressed: () {
              Navigator.of(context).pop();
              onEdit?.call();
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded, color: AppTheme.errorRed),
            onPressed: () => JournalDeleteDialog.show(
              context,
              () {
                onDelete?.call();
                Navigator.of(context).pop();
              },
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    _formatTimestamp(entry.createdAt),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                    ),
                  ),
                  if (entry.moodState != null && entry.moodState!.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppTheme.mintSecondary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Text(
                        entry.moodState!,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F766E),
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 24),
              SelectableText(
                entry.content,
                style: TextStyle(
                  fontSize: 16,
                  height: 1.6,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
