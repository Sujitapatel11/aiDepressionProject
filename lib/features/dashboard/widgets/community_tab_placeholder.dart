import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class CommunityTabPlaceholder extends StatelessWidget {
  const CommunityTabPlaceholder({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          Icon(Icons.people_outline_rounded, size: 64, color: AppTheme.mintSecondary),
          SizedBox(height: 16),
          Text(
            "Community Feature",
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppTheme.textMain,
            ),
          ),
          SizedBox(height: 8),
          Text(
            "Connect anonymously with peers who share your journey.",
            style: TextStyle(fontSize: 14, color: AppTheme.textSub),
          ),
        ],
      ),
    );
  }
}
