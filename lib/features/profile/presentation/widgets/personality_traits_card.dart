import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/base_dashboard_card.dart';
import '../../domain/entities/personality_profile_entity.dart';

/// Card widget visualizing Big Five (OCEAN) personality traits computed from reflections
class PersonalityTraitsCard extends StatelessWidget {
  final PersonalityProfileEntity personality;

  const PersonalityTraitsCard({
    Key? key,
    required this.personality,
  }) : super(key: key);

  Widget _buildTraitBar(String label, double val, Color color, bool isDark) {
    final pct = (val * 100).round();
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Column(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? const Color(0xFFE2E8F0) : AppTheme.textMain,
                ),
              ),
              Text(
                "$pct%",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: val.clamp(0.0, 1.0),
              minHeight: 6,
              backgroundColor: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BaseDashboardCard(
      child: Column(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.psychology_rounded, color: AppTheme.lavenderPrimary, size: 20),
              SizedBox(width: 8),
              Text(
                "BIG FIVE PERSONALITY METRICS",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.1,
                  color: AppTheme.lavenderPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          _buildTraitBar("Openness", personality.openness, const Color(0xFF0F766E), isDark),
          _buildTraitBar("Conscientiousness", personality.conscientiousness, const Color(0xFF2563EB), isDark),
          _buildTraitBar("Extraversion", personality.extraversion, const Color(0xFFD97706), isDark),
          _buildTraitBar("Agreeableness", personality.agreeableness, const Color(0xFF059669), isDark),
          _buildTraitBar("Emotional Resilience", 1.0 - personality.neuroticism, const Color(0xFF7C3AED), isDark),
        ],
      ),
    );
  }
}
