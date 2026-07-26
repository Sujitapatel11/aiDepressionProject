import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class DashboardEmptyView extends StatelessWidget {
  final String title;
  final String description;

  const DashboardEmptyView({
    Key? key,
    this.title = "No Data Found",
    this.description = "Start your emotional journey by creating your first entry.",
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.inbox_outlined, size: 64, color: AppTheme.textMuted),
            const SizedBox(height: 16),
            Text(
              title,
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppTheme.textMain,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              description,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 14, color: AppTheme.textSub),
            ),
          ],
        ),
      ),
    );
  }
}
