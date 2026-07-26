import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class JournalTabPlaceholder extends StatelessWidget {
  const JournalTabPlaceholder({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.book_outlined, size: 64, color: AppTheme.lavenderPrimary),
          SizedBox(height: 16),
          Text(
            "Journal Feature",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.textMain,
            ),
          ),
          SizedBox(height: 8),
          Text(
            "Write, reflect, and analyze your thoughts with AI.",
            style: TextStyle(fontSize: 14, color: AppTheme.textSub),
          ),
        ],
      ),
    );
  }
}
