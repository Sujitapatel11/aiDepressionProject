import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';
import 'skeleton_loader.dart';

/// Pre-built Skeleton Shimmer Card Placeholder for list item loading states.
class ShimmerCard extends StatelessWidget {
  final double height;

  const ShimmerCard({
    Key? key,
    this.height = 100.0,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: SkeletonLoader(
        width: double.infinity,
        height: height,
        borderRadius: AppRadius.large,
      ),
    );
  }
}
