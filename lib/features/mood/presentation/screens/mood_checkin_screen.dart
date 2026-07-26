import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../dashboard/presentation/controllers/dashboard_error_mapper.dart';
import '../controllers/mood_checkin_controller.dart';
import '../state/mood_checkin_state.dart';
import '../widgets/mood_note_input.dart';
import '../widgets/mood_selector_card.dart';

/// Presentation view for Mood Check-In screen with isolated rebuild boundaries and accessible layout
class MoodCheckInScreen extends StatefulWidget {
  final MoodCheckInController controller;
  final VoidCallback? onSuccess;

  const MoodCheckInScreen({
    Key? key,
    required this.controller,
    this.onSuccess,
  }) : super(key: key);

  @override
  State<MoodCheckInScreen> createState() => _MoodCheckInScreenState();
}

class _MoodCheckInScreenState extends State<MoodCheckInScreen> {
  late final TextEditingController _noteTextController;

  @override
  void initState() {
    super.initState();
    _noteTextController = TextEditingController(text: widget.controller.state.noteText);
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.loadToday();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    _noteTextController.dispose();
    super.dispose();
  }

  void _onControllerUpdate() {
    if (!mounted) return;
    if (_noteTextController.text != widget.controller.state.noteText) {
      _noteTextController.text = widget.controller.state.noteText;
      _noteTextController.selection = TextSelection.fromPosition(
        TextPosition(offset: _noteTextController.text.length),
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
              Text("Mood check-in saved!"),
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
          state.isEditing ? "Edit Mood Check-In" : "Daily Mood Check-In",
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
      ),
      body: SafeArea(
        child: state.isLoading
            ? const Center(child: CircularProgressIndicator(color: AppTheme.lavenderPrimary))
            : SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAlignment.start,
                  children: [
                    // 1. Header Section
                    Semantics(
                      header: true,
                      child: Column(
                        crossAxisAlignment: CrossAlignment.start,
                        children: [
                          Text(
                            "How are you feeling right now?",
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isDark ? Colors.white : AppTheme.textMain,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            "Take a gentle pause and tune into your emotional wellness.",
                            style: TextStyle(
                              fontSize: 14,
                              color: isDark ? const Color(0xFF94A3B8) : AppTheme.textSub,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Offline banner / Error banner
                    if (state.isOffline || state.isError) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: state.isOffline
                              ? AppTheme.softYellowAccent.withOpacity(0.18)
                              : AppTheme.errorRed.withOpacity(0.12),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: state.isOffline
                                ? AppTheme.softYellowAccent.withOpacity(0.4)
                                : AppTheme.errorRed.withOpacity(0.3),
                          ),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              state.isOffline ? Icons.wifi_off_rounded : Icons.error_outline_rounded,
                              color: state.isOffline ? AppTheme.textMain : AppTheme.errorRed,
                              size: 20,
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                state.isOffline
                                    ? "Network unavailable. Submission will be saved locally."
                                    : DashboardErrorMapper.mapFailureToMessage(state.failure),
                                style: TextStyle(
                                  fontSize: 13,
                                  color: state.isOffline ? AppTheme.textMain : AppTheme.errorRed,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],

                    // 2. Mood Selector Grid
                    Text(
                      "Select Mood",
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : AppTheme.textMain,
                      ),
                    ),
                    const SizedBox(height: 12),
                    RepaintBoundary(
                      child: GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          mainAxisSpacing: 12,
                          crossAxisSpacing: 12,
                          childAspectRatio: 2.3,
                        ),
                        itemCount: state.availableMoods.length,
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
                    const SizedBox(height: 28),

                    // 3. Optional Note Input
                    MoodNoteInput(
                      textController: _noteTextController,
                      maxLimit: state.maxCharacterLimit,
                      enabled: !state.isSaving,
                      onChanged: widget.controller.updateNote,
                    ),
                    const SizedBox(height: 32),

                    // 4. Save Button
                    SizedBox(
                      width: double.infinity,
                      height: 54,
                      child: Semantics(
                        label: state.isSaving ? "Saving Mood Check-In..." : "Save Mood Check-In Button",
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
                                  state.isEditing ? "Update Mood Check-In" : "Save Mood Check-In",
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
