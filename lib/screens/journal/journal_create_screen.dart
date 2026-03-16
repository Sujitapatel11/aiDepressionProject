import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../cubits/journal_cubit.dart';
import '../../cubits/journal_state.dart';
import '../../theme/app_theme.dart';

/// Screen for composing and saving a new journal entry.
///
/// Requirements: 4.1, 4.3, 4.4, 4.5
class JournalCreateScreen extends StatefulWidget {
  const JournalCreateScreen({super.key});

  @override
  State<JournalCreateScreen> createState() => _JournalCreateScreenState();
}

class _JournalCreateScreenState extends State<JournalCreateScreen> {
  final _controller = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _save(BuildContext context) {
    // Inline validation — no network call on empty/whitespace (Req 4.3)
    if (_formKey.currentState?.validate() != true) return;
    context.read<JournalCubit>().saveEntry(_controller.text);
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<JournalCubit, JournalState>(
      listener: (context, state) {
        if (state is JournalSaved) {
          // Navigate back on success (Req 4.4)
          if (Navigator.of(context).canPop()) {
            Navigator.of(context).pop();
          }
        } else if (state is JournalError) {
          // Restore preserved content so the user doesn't lose their writing
          // (Req 4.5)
          if (state.preservedContent != null &&
              _controller.text != state.preservedContent) {
            _controller.text = state.preservedContent!;
            _controller.selection = TextSelection.fromPosition(
              TextPosition(offset: _controller.text.length),
            );
          }
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: AppTheme.errorColor,
            ),
          );
        }
      },
      builder: (context, state) {
        final isSaving = state is JournalSaving;

        return Scaffold(
          backgroundColor: AppTheme.backgroundColor,
          appBar: AppBar(
            title: const Text('New Entry'),
            backgroundColor: AppTheme.surfaceColor,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Large multiline text area (Req 4.1)
                  TextFormField(
                    controller: _controller,
                    minLines: 8,
                    maxLines: null,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    style: AppTheme.bodyLarge,
                    decoration: const InputDecoration(
                      hintText: 'What\'s on your mind?',
                      alignLabelWithHint: true,
                    ),
                    validator: (value) {
                      if (value == null || value.trim().isEmpty) {
                        return 'Journal entry cannot be empty.';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 24),
                  // Save button — shows loading indicator while saving
                  ElevatedButton(
                    onPressed: isSaving ? null : () => _save(context),
                    child: isSaving
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              color: AppTheme.onPrimaryColor,
                            ),
                          )
                        : const Text('Save'),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
