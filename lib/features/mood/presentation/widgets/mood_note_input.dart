import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';

/// Performance-optimized note input widget maintaining local state for character counter updates
class MoodNoteInput extends StatefulWidget {
  final TextEditingController textController;
  final int maxLimit;
  final ValueChanged<String>? onChanged;
  final bool enabled;

  const MoodNoteInput({
    Key? key,
    required this.textController,
    this.maxLimit = 500,
    this.onChanged,
    this.enabled = true,
  }) : super(key: key);

  @override
  State<MoodNoteInput> createState() => _MoodNoteInputState();
}

class _MoodNoteInputState extends State<MoodNoteInput> {
  late int _count;

  @override
  void initState() {
    super.initState();
    _count = widget.textController.text.length;
    widget.textController.addListener(_onTextChange);
  }

  @override
  void dispose() {
    widget.textController.removeListener(_onTextChange);
    super.dispose();
  }

  void _onTextChange() {
    final newLen = widget.textController.text.length;
    if (newLen != _count) {
      setState(() {
        _count = newLen;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isExceeded = _count > widget.maxLimit;

    return RepaintBoundary(
      child: Column(
        crossAxisAlignment: CrossAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                "Optional Reflection",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
              Text(
                "$_count / ${widget.maxLimit}",
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: isExceeded
                      ? AppTheme.errorRed
                      : (isDark ? const Color(0xFF94A3B8) : AppTheme.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Semantics(
            label: "Optional reflection note text field. $_count of ${widget.maxLimit} characters used.",
            multiline: true,
            child: TextField(
              controller: widget.textController,
              enabled: widget.enabled,
              maxLines: 4,
              maxLength: widget.maxLimit,
              onChanged: widget.onChanged,
              style: TextStyle(
                fontSize: 14,
                color: isDark ? Colors.white : AppTheme.textMain,
              ),
              decoration: InputDecoration(
                counterText: '',
                hintText: "Add any thoughts, triggers, or reflections about your day...",
                hintStyle: TextStyle(
                  fontSize: 13,
                  color: isDark ? const Color(0xFF64748B) : AppTheme.textMuted,
                ),
                filled: true,
                fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                contentPadding: const EdgeInsets.all(16),
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
          ),
        ],
      ),
    );
  }
}
