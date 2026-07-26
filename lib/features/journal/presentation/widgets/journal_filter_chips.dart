import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../mood/domain/entities/mood_entity.dart';

/// Horizontal filter chips for filtering reflections by mood tag
class JournalFilterChips extends StatelessWidget {
  final String? selectedMoodFilter;
  final ValueChanged<String?> onMoodSelected;

  const JournalFilterChips({
    Key? key,
    required this.selectedMoodFilter,
    required this.onMoodSelected,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final moods = MoodEntity.defaultMoods();
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          FilterChip(
            selected: selectedMoodFilter == null,
            label: const Text("All"),
            selectedColor: AppTheme.lavenderPrimary.withOpacity(0.2),
            checkmarkColor: AppTheme.lavenderPrimary,
            labelStyle: TextStyle(
              fontSize: 13,
              fontWeight: selectedMoodFilter == null ? FontWeight.bold : FontWeight.w500,
              color: selectedMoodFilter == null
                  ? AppTheme.lavenderPrimary
                  : (isDark ? const Color(0xFF94A3B8) : AppTheme.textSub),
            ),
            onSelected: (_) => onMoodSelected(null),
          ),
          const SizedBox(width: 8),
          ...moods.map((mood) {
            final isSel = selectedMoodFilter?.toLowerCase() == mood.label.toLowerCase();
            return Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: FilterChip(
                selected: isSel,
                label: Text("${mood.emoji} ${mood.label}"),
                selectedColor: mood.color.withOpacity(0.2),
                checkmarkColor: mood.color,
                labelStyle: TextStyle(
                  fontSize: 13,
                  fontWeight: isSel ? FontWeight.bold : FontWeight.w500,
                  color: isSel
                      ? (isDark ? Colors.white : AppTheme.textMain)
                      : (isDark ? const Color(0xFF94A3B8) : AppTheme.textSub),
                ),
                onSelected: (_) => onMoodSelected(mood.label),
              ),
            );
          }).toList(),
        ],
      ),
    );
  }
}
