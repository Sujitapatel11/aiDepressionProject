import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Material Design 3 confirmation dialog for soft-deleting journal reflections
class JournalDeleteDialog extends StatelessWidget {
  final VoidCallback onConfirmDelete;

  const JournalDeleteDialog({
    Key? key,
    required this.onConfirmDelete,
  }) : super(key: key);

  static Future<bool?> show(BuildContext context, VoidCallback onConfirmDelete) {
    return showDialog<bool>(
      context: context,
      builder: (context) => JournalDeleteDialog(onConfirmDelete: onConfirmDelete),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      title: Row(
        children: const [
          Icon(Icons.delete_outline_rounded, color: AppTheme.errorRed),
          SizedBox(width: 10),
          Text(
            "Delete Reflection?",
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
      content: const Text(
        "Are you sure you want to delete this journal reflection? This action cannot be undone.",
        style: TextStyle(fontSize: 14, height: 1.4),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: const Text("Cancel"),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop(true);
            onConfirmDelete();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.errorRed,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          ),
          child: const Text("Delete"),
        ),
      ],
    );
  }
}
