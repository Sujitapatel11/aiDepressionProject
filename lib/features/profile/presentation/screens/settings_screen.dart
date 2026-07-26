import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../widgets/settings_tile.dart';

/// Screen displaying application preferences, theme toggles, and localization preferences
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      appBar: AppBar(
        title: const Text("App Preferences", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        centerTitle: true,
        elevation: 0,
        backgroundColor: Colors.transparent,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).maybePop(),
        ),
      ),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            SettingsTile(
              icon: Icons.palette_outlined,
              title: "Theme Mode",
              subtitle: isDark ? "Dark Theme Active" : "Light Theme Active",
              trailing: const Icon(Icons.check_circle, color: AppTheme.lavenderPrimary, size: 20),
            ),
            const SizedBox(height: 12),
            SettingsTile(
              icon: Icons.language_rounded,
              title: "Language",
              subtitle: "English (United States)",
            ),
            const SizedBox(height: 12),
            SettingsTile(
              icon: Icons.security_rounded,
              title: "Privacy & Data Encryption",
              subtitle: "Local cache encrypted via FlutterSecureStorage",
            ),
          ],
        ),
      ),
    );
  }
}
