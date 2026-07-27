import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';

/// User Profile Avatar Component for SoulCare.
/// Supports network images, name initials fallback generation, and online status dot indicator.
class ProfileAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double radius;
  final bool showOnlineIndicator;
  final bool isOnline;

  const ProfileAvatar({
    Key? key,
    this.imageUrl,
    this.name,
    this.radius = 24.0,
    this.showOnlineIndicator = false,
    this.isOnline = false,
  }) : super(key: key);

  String get _initials {
    if (name == null || name!.trim().isEmpty) return "SC";
    final parts = name!.trim().split(' ');
    if (parts.length >= 2) {
      return "${parts[0][0]}${parts[1][0]}".toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    Widget avatarCore;

    if (imageUrl != null && imageUrl!.isNotEmpty) {
      avatarCore = CircleAvatar(
        radius: radius,
        backgroundColor: colorScheme.primaryContainer,
        backgroundImage: NetworkImage(imageUrl!),
      );
    } else {
      avatarCore = CircleAvatar(
        radius: radius,
        backgroundColor: colorScheme.primaryContainer,
        child: Text(
          _initials,
          style: AppTypography.titleMedium.copyWith(
            color: colorScheme.onPrimaryContainer,
            fontWeight: FontWeight.w700,
            fontSize: radius * 0.7,
          ),
        ),
      );
    }

    if (!showOnlineIndicator) return avatarCore;

    final double dotSize = radius * 0.5;

    return Stack(
      children: [
        avatarCore,
        Positioned(
          right: 0,
          bottom: 0,
          child: Container(
            width: dotSize,
            height: dotSize,
            decoration: BoxDecoration(
              color: isOnline ? AppColors.successGreen : AppColors.textMutedLight,
              shape: BoxShape.circle,
              border: Border.all(color: colorScheme.surface, width: 2.0),
            ),
          ),
        ),
      ],
    );
  }
}
