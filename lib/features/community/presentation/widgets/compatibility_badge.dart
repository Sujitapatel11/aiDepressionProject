import 'package:flutter/material.dart';

/// Visual badge displaying Big Five match compatibility score (e.g. 88% Match)
class CompatibilityBadge extends StatelessWidget {
  final int score;

  const CompatibilityBadge({
    Key? key,
    required this.score,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isHighMatch = score >= 75;
    final color = isHighMatch ? const Color(0xFF0F766E) : const Color(0xFF475569);
    final bgColor = isHighMatch ? const Color(0xFFCCFBF1) : const Color(0xFFF1F5F9);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            isHighMatch ? Icons.favorite_rounded : Icons.people_outline_rounded,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 4),
          Text(
            "$score% Match",
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
