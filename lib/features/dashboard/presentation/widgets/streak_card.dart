import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'base_dashboard_card.dart';

/// Card widget displaying active streak, best streak, and backend motivational progress message
class StreakCard extends StatelessWidget {
  final int activeStreakDays;
  final int bestStreakDays;
  final String? customMotivationalMessage;

  const StreakCard({
    Key? key,
    required this.activeStreakDays,
    this.bestStreakDays = 0,
    this.customMotivationalMessage,
  }) : super(key: key);

  String get _motivationalMessage {
    if (customMotivationalMessage != null && customMotivationalMessage!.isNotEmpty) {
      return customMotivationalMessage!;
    }
    if (activeStreakDays == 0) {
      return "Start your reflection journey today to build your streak!";
    } else if (activeStreakDays == 1) {
      return "Great start! One day of mindful reflection down.";
    } else if (activeStreakDays < 7) {
      return "You're building momentum! Keep checking in daily.";
    } else {
      return "Outstanding consistency! Your mindfulness habit is thriving.";
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final int effectiveBest = bestStreakDays > activeStreakDays ? bestStreakDays : activeStreakDays;

    return BaseDashboardCard(
      borderColor: AppTheme.softYellowAccent.withOpacity(0.3),
      backgroundColor: isDark
          ? const Color(0xFF1E1B4B)
          : AppTheme.softYellowAccent.withOpacity(0.12),
      semanticLabel: "Current Streak: $activeStreakDays Days. Best Streak: $effectiveBest Days. $_motivationalMessage",
      child: Row(
        crossAxisAlignment: CrossAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: AppTheme.softYellowAccent.withOpacity(0.3),
              shape: BoxShape.circle,
            ),
            child: const Text("🔥", style: TextStyle(fontSize: 28)),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      "$activeStreakDays Day Streak",
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : AppTheme.textMain,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isDark
                            ? AppTheme.lavenderPrimary.withOpacity(0.2)
                            : Colors.white,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        "Best: $effectiveBest d",
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppTheme.mintSecondary : AppTheme.lavenderPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  _motivationalMessage,
                  style: TextStyle(
                    fontSize: 13,
                    height: 1.35,
                    color: isDark ? const Color(0xFFCBD5E1) : AppTheme.textSub,
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
