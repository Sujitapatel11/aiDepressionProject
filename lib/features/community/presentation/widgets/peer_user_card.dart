import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/base_dashboard_card.dart';
import '../../../dashboard/presentation/widgets/user_avatar.dart';
import '../../domain/entities/peer_user_entity.dart';
import 'compatibility_badge.dart';

/// Card widget displaying candidate peer support match with compatibility badge and Connect button
class PeerUserCard extends StatelessWidget {
  final PeerUserEntity peer;
  final bool isPending;
  final VoidCallback? onConnect;
  final VoidCallback? onTap;

  const PeerUserCard({
    Key? key,
    required this.peer,
    this.isPending = false,
    this.onConnect,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return BaseDashboardCard(
      onTap: onTap,
      semanticLabel: "Peer match ${peer.username} with ${peer.matchScore} percent compatibility match.",
      child: Row(
        children: [
          UserAvatar(
            userName: peer.username,
            radius: 24,
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Text(
                  peer.username,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : AppTheme.textMain,
                  ),
                ),
                const SizedBox(height: 4),
                CompatibilityBadge(score: peer.matchScore),
              ],
            ),
          ),
          const SizedBox(width: 10),
          SizedBox(
            height: 38,
            child: ElevatedButton(
              onPressed: isPending ? null : onConnect,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.lavenderPrimary,
                foregroundColor: Colors.white,
                disabledBackgroundColor: AppTheme.lavenderPrimary.withOpacity(0.4),
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 16),
              ),
              child: Text(
                isPending ? "Pending" : "Connect",
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
