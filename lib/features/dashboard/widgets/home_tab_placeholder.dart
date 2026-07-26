import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../domain/entities/dashboard_summary_entity.dart';

/// Reusable Home Tab Placeholder Widget
class HomeTabPlaceholder extends StatelessWidget {
  final DashboardSummaryEntity? summary;
  final Future<void> Function() onRefresh;

  const HomeTabPlaceholder({
    Key? key,
    required this.summary,
    required this.onRefresh,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: onRefresh,
      color: AppTheme.lavenderPrimary,
      child: ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAlignment.start,
                children: [
                  Text(
                    "Welcome back, ${summary?.username ?? 'Friend'} 👋",
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppTheme.textMain,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    "How are you feeling today?",
                    style: TextStyle(
                      fontSize: 14,
                      color: AppTheme.textSub,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: AppTheme.softYellowAccent.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  children: [
                    const Text("🔥 ", style: TextStyle(fontSize: 14)),
                    Text(
                      "${summary?.activeStreakDays ?? 0} Days",
                      style: const TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.textMain,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 32),
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppTheme.lavenderPrimary.withOpacity(0.15),
                  AppTheme.mintSecondary.withOpacity(0.15),
                ],
              ),
              borderRadius: BorderRadius.circular(28),
              border: Border.all(
                color: AppTheme.lavenderPrimary.withOpacity(0.2),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: const [
                Text(
                  "Daily Reflection",
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textMain,
                  ),
                ),
                SizedBox(height: 8),
                Text(
                  "Take a moment to check in with yourself. Your emotional wellness journey starts with single steps.",
                  style: TextStyle(
                    fontSize: 14,
                    color: AppTheme.textSub,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
