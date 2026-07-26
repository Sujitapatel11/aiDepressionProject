import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class InsightsTabPlaceholder extends StatelessWidget {
  const InsightsTabPlaceholder({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.insights_rounded, size: 64, color: AppTheme.softYellowAccent),
          SizedBox(height: 16),
          Text(
            "Insights Feature",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.textMain,
            ),
          ),
          SizedBox(height: 8),
          Text(
            "Track emotional trends, NLP sentiment & OCEAN personality metrics.",
            style: TextStyle(fontSize: 14, color: AppTheme.textSub),
          ),
        ],
      ),
    );
  }
}
