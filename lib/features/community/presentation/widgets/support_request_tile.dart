import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/user_avatar.dart';
import '../../domain/entities/support_request_entity.dart';

/// Request banner tile displaying incoming peer request with Accept/Reject actions
class SupportRequestTile extends StatelessWidget {
  final SupportRequestEntity request;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const SupportRequestTile({
    Key? key,
    required this.request,
    required this.onAccept,
    required this.onReject,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: AppTheme.lavenderPrimary.withOpacity(0.3),
        ),
      ),
      child: Row(
        children: [
          UserAvatar(
            userName: request.fromUser.username,
            radius: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Text(
                  request.fromUser.username,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : AppTheme.textMain,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  "Sent you a peer support connection request",
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            icon: const Icon(Icons.check_circle_rounded, color: AppTheme.mintSecondary, size: 28),
            onPressed: onAccept,
          ),
          IconButton(
            icon: const Icon(Icons.cancel_rounded, color: AppTheme.errorRed, size: 28),
            onPressed: onReject,
          ),
        ],
      ),
    );
  }
}
