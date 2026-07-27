import 'package:flutter/material.dart';
import '../../colors/app_colors.dart';
import '../../typography/app_typography.dart';

/// Reusable User Avatar Component for SoulCare Design System.
/// Supports Image URLs, Initials fallback, and online availability status indicator dots.
class SoulCareAvatar extends StatelessWidget {
  final String? imageUrl;
  final String? name;
  final double radius;
  final bool showOnlineIndicator;
  final bool isOnline;

  const SoulCareAvatar({
    Key? key,
    this.imageUrl,
    this.name,
    this.radius = 24.0,
    this.showOnlineIndicator = false,
    this.isOnline = false,
  }) : super(key: key);

  /// Small Avatar (Size 32 dp diameter)
  factory SoulCareAvatar.small({
    Key? key,
    String? imageUrl,
    String? name,
    bool showOnlineIndicator = false,
    bool isOnline = false,
  }) {
    return SoulCareAvatar(
      key: key,
      imageUrl: imageUrl,
      name: name,
      radius: 16.0,
      showOnlineIndicator: showOnlineIndicator,
      isOnline: isOnline,
    );
  }

  /// Large Avatar (Size 64 dp diameter)
  factory SoulCareAvatar.large({
    Key? key,
    String? imageUrl,
    String? name,
    bool showOnlineIndicator = false,
    bool isOnline = false,
  }) {
    return SoulCareAvatar(
      key: key,
      imageUrl: imageUrl,
      name: name,
      radius: 32.0,
      showOnlineIndicator: showOnlineIndicator,
      isOnline: isOnline,
    );
  }

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
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

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
