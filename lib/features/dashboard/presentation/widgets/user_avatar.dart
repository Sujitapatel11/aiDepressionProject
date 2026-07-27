import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Reusable User Avatar component supporting initial fallbacks, profile image URLs, and 48dp touch targets
class UserAvatar extends StatelessWidget {
  final String userName;
  final String? avatarUrl;
  final double size;
  final VoidCallback? onTap;

  const UserAvatar({
    Key? key,
    required this.userName,
    this.avatarUrl,
    this.size = 48.0,
    this.onTap,
  }) : super(key: key);

  String get _initial {
    if (userName.trim().isEmpty) return 'S';
    return userName.trim()[0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final double targetSize = size < 48.0 ? 48.0 : size;

    final avatarWidget = Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        gradient: const LinearGradient(
          colors: [AppTheme.lavenderPrimary, AppTheme.mintSecondary],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        boxShadow: [
          BoxShadow(
            color: AppTheme.lavenderPrimary.withOpacity(0.25),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: ClipOval(
        child: (avatarUrl != null && avatarUrl!.isNotEmpty)
            ? Image(
                image: ResizeImage(
                  NetworkImage(avatarUrl!),
                  width: (size * 2).toInt(),
                  height: (size * 2).toInt(),
                ),
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => _buildInitialText(),
              )
            : _buildInitialText(),
      ),
    );

    return Semantics(
      label: "User Profile Avatar for $userName",
      button: onTap != null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(targetSize / 2),
        child: SizedBox(
          width: targetSize,
          height: targetSize,
          child: Center(child: avatarWidget),
        ),
      ),
    );
  }

  Widget _buildInitialText() {
    return Center(
      child: Text(
        _initial,
        style: TextStyle(
          fontSize: size * 0.42,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
    );
  }
}
