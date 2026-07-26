import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

class DashboardLoadingView extends StatelessWidget {
  const DashboardLoadingView({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: const [
          CircularProgressIndicator(
            color: AppTheme.lavenderPrimary,
            strokeWidth: 3,
          ),
          SizedBox(height: 16),
          Text(
            "Loading your sanctuary...",
            style: TextStyle(
              fontSize: 14,
              color: AppTheme.textSub,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
