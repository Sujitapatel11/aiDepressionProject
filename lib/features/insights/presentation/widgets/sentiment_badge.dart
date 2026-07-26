import 'package:flutter/material.dart';

/// Visual badge displaying sentiment score provided by the backend (never calculated locally)
class SentimentBadge extends StatelessWidget {
  final double? score;

  const SentimentBadge({
    Key? key,
    this.score,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (score == null) return const SizedBox.shrink();

    final isPositive = score! >= 0.2;
    final isNegative = score! <= -0.2;

    final color = isPositive
        ? const Color(0xFF0F766E)
        : (isNegative ? const Color(0xFFB91C1C) : const Color(0xFF475569));

    final bgColor = isPositive
        ? const Color(0xFFCCFBF1)
        : (isNegative ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9));

    final label = isPositive
        ? "Positive Tone"
        : (isNegative ? "Processing Heavy Emotions" : "Balanced Sentiment");

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
            isPositive ? Icons.trending_up_rounded : Icons.bubble_chart_outlined,
            size: 14,
            color: color,
          ),
          const SizedBox(width: 6),
          Text(
            label,
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
