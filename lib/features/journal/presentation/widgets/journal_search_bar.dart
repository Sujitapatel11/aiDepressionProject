import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Text search bar widget for filtering journal reflections
class JournalSearchBar extends StatelessWidget {
  final String query;
  final ValueChanged<String> onChanged;
  final VoidCallback? onClear;

  const JournalSearchBar({
    Key? key,
    required this.query,
    required this.onChanged,
    this.onClear,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Semantics(
      label: "Search journal reflections field",
      child: TextField(
        onChanged: onChanged,
        style: TextStyle(
          fontSize: 14,
          color: isDark ? Colors.white : AppTheme.textMain,
        ),
        decoration: InputDecoration(
          hintText: "Search reflections...",
          hintStyle: TextStyle(
            fontSize: 14,
            color: isDark ? const Color(0xFF64748B) : AppTheme.textMuted,
          ),
          prefixIcon: const Icon(Icons.search_rounded, size: 20),
          suffixIcon: query.isNotEmpty
              ? IconButton(
                  icon: const Icon(Icons.clear_rounded, size: 18),
                  onPressed: onClear,
                )
              : null,
          filled: true,
          fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            ),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: BorderSide(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            ),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(20),
            borderSide: const BorderSide(
              color: AppTheme.lavenderPrimary,
              width: 2.0,
            ),
          ),
        ),
      ),
    );
  }
}
