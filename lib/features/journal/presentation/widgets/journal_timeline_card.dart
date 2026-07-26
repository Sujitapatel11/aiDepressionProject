import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/base_dashboard_card.dart';
import '../../domain/entities/journal_entry_entity.dart';

/// Timeline item card displaying reflection snippet, mood badge, timestamp, and edit/delete actions
class JournalTimelineCard extends StatelessWidget {
  final JournalEntryEntity entry;
  final VoidCallback? onTap;
  final VoidCallback? onEditTap;
  final VoidCallback? onDeleteTap;

  const JournalTimelineCard({
    Key? key,
    required this.entry,
    this.onTap,
    this.onEditTap,
    this.onDeleteTap,
  }) : super(key: key);

  String _formatTimestamp(DateTime dt) {
    return DateFormat('MMM d, y • h:mm a').format(dt);
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BaseDashboardCard(
      onTap: onTap,
      semanticLabel: "Journal reflection from ${_formatTimestamp(entry.createdAt)}. ${entry.titleSnippet}",
      child: Column(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: AppTheme.lavenderPrimary.withOpacity(0.12),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.book_outlined,
                      color: AppTheme.lavenderPrimary,
                      size: 18,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Text(
                    _formatTimestamp(entry.createdAt),
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  if (entry.moodState != null && entry.moodState!.isNotEmpty)
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.mintSecondary.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        entry.moodState!,
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF0F766E),
                        ),
                      ),
                    ),
                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_vert_rounded,
                      size: 20,
                      color: isDark ? const Color(0xFF94A3B8) : AppTheme.textMuted,
                    ),
                    onSelected: (val) {
                      if (val == 'edit') onEditTap?.call();
                      if (val == 'delete') onDeleteTap?.call();
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: Row(
                          children: [
                            Icon(Icons.edit_outlined, size: 18),
                            SizedBox(width: 8),
                            Text("Edit Reflection"),
                          ],
                        ),
                      ),
                      const PopupMenuItem(
                        value: 'delete',
                        child: Row(
                          children: [
                            Icon(Icons.delete_outline_rounded, color: AppTheme.errorRed, size: 18),
                            SizedBox(width: 8),
                            Text("Delete Reflection", style: TextStyle(color: AppTheme.errorRed)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            entry.content,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 14,
              height: 1.4,
              color: isDark ? Colors.white : AppTheme.textMain,
            ),
          ),
        ],
      ),
    );
  }
}
