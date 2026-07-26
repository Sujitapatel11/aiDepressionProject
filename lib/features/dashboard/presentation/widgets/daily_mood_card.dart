import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'base_dashboard_card.dart';

/// Card displaying today's logged mood state or prompt for Mood Check-In
class DailyMoodCard extends StatelessWidget {
  final String? moodState;
  final VoidCallback? onMoodCheckIn;

  const DailyMoodCard({
    Key? key,
    this.moodState,
    this.onMoodCheckIn,
  }) : super(key: key);

  bool get _hasMood => moodState != null && moodState!.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BaseDashboardCard(
      semanticLabel: _hasMood ? "Today's Mood: ${moodState!}" : "Daily Mood Check-In Prompt",
      child: _hasMood ? _buildMoodView(isDark) : _buildPromptView(context, isDark),
    );
  }

  Widget _buildMoodView(bool isDark) {
    return Row(
      children: [
        Container(
          width: 52,
          height: 52,
          decoration: BoxDecoration(
            color: AppTheme.softYellowAccent.withOpacity(0.2),
            shape: BoxShape.circle,
          ),
          child: const Center(
            child: Text("🌿", style: TextStyle(fontSize: 26)),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAlignment.start,
            children: [
              Text(
                "Today's Mood",
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                moodState!,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildPromptView(BuildContext context, bool isDark) {
    return Column(
      crossAxisAlignment: CrossAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: AppTheme.lavenderPrimary.withOpacity(0.12),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.sentiment_satisfied_alt_rounded,
                color: AppTheme.lavenderPrimary,
                size: 24,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAlignment.start,
                children: [
                  Text(
                    "Daily Mood",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppTheme.mintSecondary : AppTheme.lavenderPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    "How are you feeling today?",
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: isDark ? Colors.white : AppTheme.textMain,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: Semantics(
            label: "Perform Mood Check-In",
            button: true,
            child: ElevatedButton.icon(
              onPressed: onMoodCheckIn,
              icon: const Icon(Icons.favorite_border_rounded, size: 20),
              label: const Text(
                "Mood Check-In",
                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.lavenderPrimary,
                foregroundColor: Colors.white,
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
