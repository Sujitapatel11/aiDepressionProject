import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/base_dashboard_card.dart';
import '../../../dashboard/presentation/widgets/user_avatar.dart';
import '../../domain/entities/user_profile_entity.dart';

/// Header card widget displaying user avatar, display name, and email
class ProfileHeaderCard extends StatelessWidget {
  final UserProfileEntity profile;
  final VoidCallback? onEdit;

  const ProfileHeaderCard({
    Key? key,
    required this.profile,
    this.onEdit,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BaseDashboardCard(
      child: Row(
        children: [
          UserAvatar(
            userName: profile.displayName,
            radius: 30,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Text(
                  profile.displayName,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : AppTheme.textMain,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  profile.email,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                  ),
                ),
              ],
            ),
          ),
          if (onEdit != null)
            IconButton(
              icon: const Icon(Icons.edit_outlined, color: AppTheme.lavenderPrimary, size: 20),
              onPressed: onEdit,
            ),
        ],
      ),
    );
  }
}
