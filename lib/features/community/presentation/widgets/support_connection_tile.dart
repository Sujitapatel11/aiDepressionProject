import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/user_avatar.dart';
import '../../domain/entities/support_connection_entity.dart';

/// Tile widget displaying active peer connection with disconnect menu action
class SupportConnectionTile extends StatelessWidget {
  final SupportConnectionEntity connection;
  final VoidCallback? onDisconnect;

  const SupportConnectionTile({
    Key? key,
    required this.connection,
    this.onDisconnect,
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
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      child: Row(
        children: [
          UserAvatar(
            userName: connection.alias,
            radius: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAlignment.start,
              children: [
                Text(
                  connection.alias,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: isDark ? Colors.white : AppTheme.textMain,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: const [
                    Icon(Icons.circle, color: AppTheme.mintSecondary, size: 8),
                    SizedBox(width: 6),
                    Text(
                      "Connected Peer Support",
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.mintSecondary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_vert_rounded,
              size: 20,
              color: isDark ? const Color(0xFF94A3B8) : AppTheme.textMuted,
            ),
            onSelected: (val) {
              if (val == 'disconnect') onDisconnect?.call();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'disconnect',
                child: Row(
                  children: [
                    Icon(Icons.link_off_rounded, color: AppTheme.errorRed, size: 18),
                    SizedBox(width: 8),
                    Text("Disconnect Peer", style: TextStyle(color: AppTheme.errorRed)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
