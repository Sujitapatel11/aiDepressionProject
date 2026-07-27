import 'package:flutter/material.dart';
import '../../../design_system/design_system.dart';
import '../buttons/primary_button.dart';

/// Confirmation Dialog with Danger/Primary CTA Button options for SoulCare.
class ConfirmationDialog extends StatelessWidget {
  final String title;
  final String message;
  final String confirmLabel;
  final String cancelLabel;
  final VoidCallback onConfirm;
  final bool isDanger;

  const ConfirmationDialog({
    Key? key,
    required this.title,
    required this.message,
    this.confirmLabel = "Confirm",
    this.cancelLabel = "Cancel",
    required this.onConfirm,
    this.isDanger = false,
  }) : super(key: key);

  static Future<bool?> show({
    required BuildContext context,
    required String title,
    required String message,
    String confirmLabel = "Confirm",
    String cancelLabel = "Cancel",
    required VoidCallback onConfirm,
    bool isDanger = false,
  }) {
    return showDialog<bool>(
      context: context,
      builder: (ctx) => ConfirmationDialog(
        title: title,
        message: message,
        confirmLabel: confirmLabel,
        cancelLabel: cancelLabel,
        onConfirm: onConfirm,
        isDanger: isDanger,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final confirmColor = isDanger ? colorScheme.error : colorScheme.primary;

    return AlertDialog(
      shape: const RoundedRectangleBorder(borderRadius: AppRadius.large),
      backgroundColor: colorScheme.surface,
      title: Text(
        title,
        style: AppTypography.titleLarge.copyWith(
          color: colorScheme.onSurface,
          fontWeight: FontWeight.w700,
        ),
      ),
      content: Text(
        message,
        style: AppTypography.bodyMedium.copyWith(
          color: colorScheme.onSurfaceVariant,
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(false),
          child: Text(cancelLabel, style: TextStyle(color: colorScheme.onSurfaceVariant)),
        ),
        ElevatedButton(
          onPressed: () {
            Navigator.of(context).pop(true);
            onConfirm();
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: confirmColor,
            foregroundColor: Colors.white,
            shape: const StadiumBorder(),
          ),
          child: Text(confirmLabel),
        ),
      ],
    );
  }
}
