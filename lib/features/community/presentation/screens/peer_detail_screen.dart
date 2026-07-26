import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/widgets/user_avatar.dart';
import '../../domain/entities/peer_user_entity.dart';
import '../widgets/compatibility_badge.dart';

/// Screen displaying candidate peer detail with Big Five compatibility match score and connect action
class PeerDetailScreen extends StatelessWidget {
  final PeerUserEntity peer;
  final VoidCallback? onConnect;

  const PeerDetailScreen({
    Key? key,
    required this.peer,
    this.onConnect,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      appBar: AppBar(
        title: const Text(
          "Peer Match Profile",
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            children: [
              const SizedBox(height: 20),
              UserAvatar(
                userName: peer.username,
                radius: 44,
              ),
              const SizedBox(height: 16),
              Text(
                peer.username,
                style: TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
              const SizedBox(height: 8),
              CompatibilityBadge(score: peer.matchScore),
              const SizedBox(height: 32),

              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Column(
                  children: [
                    const Icon(
                      Icons.shield_outlined,
                      color: AppTheme.lavenderPrimary,
                      size: 28,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      "Anonymous & Safe Support",
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : AppTheme.textMain,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "SoulCare connects you with empathetic peers based on personality compatibility without exposing sensitive personal identifiers.",
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        height: 1.5,
                        color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              SizedBox(
                width: double.infinity,
                height: 54,
                child: ElevatedButton.icon(
                  onPressed: () {
                    onConnect?.call();
                    Navigator.of(context).pop();
                  },
                  icon: const Icon(Icons.person_add_outlined),
                  label: const Text(
                    "Send Support Request",
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.lavenderPrimary,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
