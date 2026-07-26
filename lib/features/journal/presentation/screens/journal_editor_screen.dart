import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/controllers/dashboard_error_mapper.dart';
import '../../../mood/presentation/widgets/mood_selector_card.dart';
import '../controllers/journal_editor_controller.dart';
import '../state/journal_editor_state.dart';

/// Full reflection editor screen with debounced auto-save status, mood selector reuse, and save action
class JournalEditorScreen extends StatefulWidget {
  final JournalEditorController controller;
  final VoidCallback? onSuccess;

  const JournalEditorScreen({
    Key? key,
    required this.controller,
    this.onSuccess,
  }) : super(key: key);

  @override
  State<JournalEditorScreen> createState() => _JournalEditorScreenState();
}

class _JournalEditorScreenState extends State<JournalEditorScreen> {
  late final TextEditingController _bodyTextController;

  @override
  void initState() {
    super.initState();
    _bodyTextController = TextEditingController(text: widget.controller.state.bodyText);
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.recoverDraft();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    _bodyTextController.dispose();
    super.dispose();
  }

  void _onControllerUpdate() {
    if (!mounted) return;
    if (_bodyTextController.text != widget.controller.state.bodyText) {
      _bodyTextController.text = widget.controller.state.bodyText;
      _bodyTextController.selection = TextSelection.fromPosition(
        TextPosition(offset: _bodyTextController.text.length),
      );
    }
    setState(() {});
  }

  Future<void> _handleSave() async {
    final success = await widget.controller.submit();
    if (!mounted) return;

    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: const [
              Icon(Icons.check_circle_outline_rounded, color: Colors.white),
              SizedBox(width: 10),
              Text("Journal reflection saved!"),
            ],
          ),
          backgroundColor: AppTheme.lavenderPrimary,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          duration: const Duration(seconds: 2),
        ),
      );
      widget.onSuccess?.call();
      Navigator.of(context).maybePop();
    }
  }

  @override
  Widget build(BuildContext context) {
    final state = widget.controller.state;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      appBar: AppBar(
        title: Text(
          state.isEditingExisting ? "Edit Reflection" : "New Reflection",
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : AppTheme.textMain,
          ),
        ),
        centerTitle: true,
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
        actions: [
          // Auto-save status indicator
          Center(
            child: Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: state.isAutoSaving
                    ? Row(
                        key: const ValueKey('autosaving'),
                        children: const [
                          SizedBox(
                            width: 12,
                            height: 12,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(AppTheme.lavenderPrimary),
                            ),
                          ),
                          SizedBox(width: 6),
                          Text(
                            "Saving...",
                            style: TextStyle(fontSize: 12, color: AppTheme.lavenderPrimary),
                          ),
                        ],
                      )
                    : state.isDraft
                        ? Row(
                            key: const ValueKey('draftsaved'),
                            children: const [
                              Icon(Icons.cloud_done_outlined, size: 14, color: AppTheme.mintSecondary),
                              SizedBox(width: 4),
                              Text(
                                "Draft saved",
                                style: TextStyle(fontSize: 12, color: AppTheme.mintSecondary),
                              ),
                            ],
                          )
                        : const SizedBox.shrink(),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAlignment.start,
            children: [
              // Error feedback if failed
              if (state.failure != null) ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppTheme.errorRed.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: AppTheme.errorRed.withOpacity(0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline_rounded, color: AppTheme.errorRed, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          DashboardErrorMapper.mapFailureToMessage(null),
                          style: const TextStyle(fontSize: 13, color: AppTheme.errorRed),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // 1. Mood Tag Selector Reuse
              Text(
                "How are you feeling during this reflection?",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 52,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: state.availableMoods.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final mood = state.availableMoods[index];
                    final isSelected = state.selectedMood == mood;
                    return MoodSelectorCard(
                      mood: mood,
                      isSelected: isSelected,
                      onTap: state.isSaving ? null : () => widget.controller.selectMood(mood),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),

              // 2. Reflection Content Body Text Field
              Text(
                "Your Reflection",
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : AppTheme.textMain,
                ),
              ),
              const SizedBox(height: 8),
              Semantics(
                label: "Journal reflection body text area",
                multiline: true,
                child: TextField(
                  controller: _bodyTextController,
                  enabled: !state.isSaving,
                  maxLines: 12,
                  onChanged: widget.controller.updateDraft,
                  style: TextStyle(
                    fontSize: 15,
                    height: 1.5,
                    color: isDark ? Colors.white : AppTheme.textMain,
                  ),
                  decoration: InputDecoration(
                    hintText: "Express your thoughts, emotions, mindfulness reflections, or daily breakthroughs...",
                    hintStyle: TextStyle(
                      fontSize: 14,
                      color: isDark ? const Color(0xFF64748B) : AppTheme.textMuted,
                    ),
                    filled: true,
                    fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                    contentPadding: const EdgeInsets.all(20),
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
              const SizedBox(height: 32),

              // 3. Save Button
              SizedBox(
                width: double.infinity,
                height: 54,
                child: Semantics(
                  label: state.isSaving ? "Saving Journal Reflection..." : "Save Reflection Button",
                  button: true,
                  child: ElevatedButton(
                    onPressed: state.canSave ? _handleSave : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.lavenderPrimary,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: AppTheme.lavenderPrimary.withOpacity(0.4),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                      ),
                    ),
                    child: state.isSaving
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Text(
                            state.isEditingExisting ? "Update Reflection" : "Save Reflection",
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
