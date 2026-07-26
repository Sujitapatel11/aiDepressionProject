import 'package:flutter/material.dart';
import '../../core/storage/secure_storage_service.dart';
import 'login_screen.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _darkMode = false;
  bool _dailyReminders = true;

  Future<void> _handleLogout() async {
    final storage = SecureStorageService();
    await storage.clearAuthData();

    if (mounted) {
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const SoulCareLoginScreen()),
        (route) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F5FA),
      appBar: AppBar(
        title: const Text(
          "Settings & Security",
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE6E1E5)),
            ),
            child: Column(
              children: [
                SwitchListTile(
                  title: const Text("Dark Theme"),
                  subtitle: const Text("Use calming dark color palette"),
                  value: _darkMode,
                  activeColor: const Color(0xFF6750A4),
                  onChanged: (val) => setState(() => _darkMode = val),
                ),
                const Divider(height: 1),
                SwitchListTile(
                  title: const Text("Daily Mindful Reminders"),
                  subtitle: const Text("Gentle push notifications for check-ins"),
                  value: _dailyReminders,
                  activeColor: const Color(0xFF6750A4),
                  onChanged: (val) => setState(() => _dailyReminders = val),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),

          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: const Color(0xFFE6E1E5)),
            ),
            child: Column(
              children: [
                ListTile(
                  leading: const Icon(Icons.privacy_tip_outlined),
                  title: const Text("Privacy & Data Safety"),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {},
                ),
                const Divider(height: 1),
                ListTile(
                  leading: const Icon(Icons.help_outline_rounded),
                  title: const Text("Help & Support Center"),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () {},
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),

          SizedBox(
            height: 52,
            child: OutlinedButton.icon(
              onPressed: _handleLogout,
              icon: const Icon(Icons.logout_rounded, color: Color(0xFFB3261E)),
              label: const Text(
                "Log Out",
                style: TextStyle(
                  color: Color(0xFFB3261E),
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Color(0xFFF8B4B4)),
                shape: const StadiumBorder(),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
