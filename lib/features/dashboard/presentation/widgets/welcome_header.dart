import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import 'user_avatar.dart';

/// Header widget displaying greeting, username, current date, and reusable UserAvatar
class WelcomeHeader extends StatelessWidget {
  final String userName;
  final String? userAvatarUrl;
  final String greeting;
  final String formattedDate;
  final VoidCallback? onAvatarTap;

  const WelcomeHeader({
    Key? key,
    required this.userName,
    this.userAvatarUrl,
    required this.greeting,
    required this.formattedDate,
    this.onAvatarTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      label: "$greeting, $userName. Today is $formattedDate.",
      header: true,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        crossAxisAlignment: CrossAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  children: [
                    Text(
                      "$greeting, ",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w500,
                        color: isDark ? AppTheme.mintSecondary : AppTheme.lavenderPrimary,
                      ),
                    ),
                    Flexible(
                      child: Text(
                        "$userName 👋",
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.textMain,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  formattedDate,
                  style: TextStyle(
                    fontSize: 13,
                    color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          UserAvatar(
            userName: userName,
            avatarUrl: userAvatarUrl,
            size: 48,
            onTap: onAvatarTap,
          ),
        ],
      ),
    );
  }
}
