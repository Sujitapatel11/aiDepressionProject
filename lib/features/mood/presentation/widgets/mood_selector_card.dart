import 'package:flutter/material.dart';
import '../../domain/entities/mood_entity.dart';

/// Data-driven selectable mood card supporting dynamic moods, focus nodes, animations (< 180ms), and 48dp touch targets
class MoodSelectorCard extends StatefulWidget {
  final MoodEntity mood;
  final bool isSelected;
  final VoidCallback? onTap;

  const MoodSelectorCard({
    Key? key,
    required this.mood,
    required this.isSelected,
    this.onTap,
  }) : super(key: key);

  @override
  State<MoodSelectorCard> createState() => _MoodSelectorCardState();
}

class _MoodSelectorCardState extends State<MoodSelectorCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController _animController;
  late final Animation<double> _scaleAnimation;
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 180),
    );
    _scaleAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic),
    );

    if (widget.isSelected) _animController.forward();
  }

  @override
  void didUpdateWidget(covariant MoodSelectorCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.isSelected != oldWidget.isSelected) {
      if (widget.isSelected) {
        _animController.forward();
      } else {
        _animController.reverse();
      }
    }
  }

  @override
  void dispose() {
    _focusNode.dispose();
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final mood = widget.mood;
    final isSelected = widget.isSelected;

    final bgColor = isSelected
        ? mood.color.withOpacity(isDark ? 0.25 : 0.18)
        : (isDark ? const Color(0xFF1E293B) : const Color(0xFFF8FAFC));

    final borderColor = isSelected
        ? mood.color
        : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0));

    return Semantics(
      label: "Mood Option: ${mood.label}. ${isSelected ? 'Selected' : 'Not selected'}",
      selected: isSelected,
      button: true,
      child: RepaintBoundary(
        child: AnimatedBuilder(
          animation: _scaleAnimation,
          builder: (context, child) => Transform.scale(
            scale: _scaleAnimation.value,
            child: child,
          ),
          child: Material(
            color: bgColor,
            borderRadius: BorderRadius.circular(20),
            child: InkWell(
              focusNode: _focusNode,
              onTap: widget.onTap,
              borderRadius: BorderRadius.circular(20),
              child: Container(
                constraints: const BoxConstraints(minHeight: 52, minWidth: 48),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: borderColor,
                    width: isSelected ? 2.0 : 1.2,
                  ),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      mood.emoji,
                      style: const TextStyle(fontSize: 26),
                    ),
                    const SizedBox(width: 10),
                    Flexible(
                      child: Text(
                        mood.label,
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                          color: isDark ? Colors.white : const Color(0xFF1E293B),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
