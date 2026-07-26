import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/controllers/dashboard_error_mapper.dart';
import '../../../dashboard/presentation/widgets/offline_banner.dart';
import '../../../dashboard/widgets/dashboard_error_view.dart';
import '../controllers/profile_controller.dart';
import '../widgets/personality_traits_card.dart';
import '../widgets/profile_header_card.dart';
import '../widgets/profile_skeleton_loader.dart';
import '../widgets/settings_tile.dart';
import 'edit_profile_screen.dart';
import 'settings_screen.dart';

/// Presentation view for Profile & Settings screen
class ProfileScreen extends StatefulWidget {
  final ProfileController controller;
  final VoidCallback? onLogout;

  const ProfileScreen({
    Key? key,
    required this.controller,
    this.onLogout,
  }) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.loadProfile();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  void _openEditProfile(profile) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => EditProfileScreen(
          currentDisplayName: profile.displayName,
          onSave: widget.controller.updateProfile,
        ),
      ),
    );
  }

  void _openSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => const SettingsScreen(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final state = widget.controller.state;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      appBar: AppBar(
        title: Text(
          "Profile & Settings",
          style: TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : AppTheme.textMain,
          ),
        ),
        elevation: 0,
        backgroundColor: Colors.transparent,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: Builder(
          builder: (context) {
            if (state.isLoading && !state.hasData) {
              return const ProfileSkeletonLoader();
            }

            if (state.isError && !state.hasData) {
              return DashboardErrorView(
                message: DashboardErrorMapper.mapFailureToMessage(null),
                onRetry: widget.controller.loadProfile,
              );
            }

            final user = state.userProfile;
            final personality = state.personalityProfile;

            return RefreshIndicator(
              onRefresh: widget.controller.refresh,
              color: AppTheme.lavenderPrimary,
              child: SingleChildScrollView(
                key: const PageStorageKey('profile_screen_list'),
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAlignment.start,
                  children: [
                    if (state.isOffline) const OfflineBanner(),

                    // Profile Header Card
                    if (user != null)
                      ProfileHeaderCard(
                        profile: user,
                        onEdit: () => _openEditProfile(user),
                      ),
                    const SizedBox(height: 20),

                    // Big Five Personality Traits Card
                    if (personality != null)
                      PersonalityTraitsCard(personality: personality),
                    const SizedBox(height: 24),

                    // Settings Section Title
                    Text(
                      "Preferences & Controls",
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                        color: isDark ? Colors.white : AppTheme.textMain,
                      ),
                    ),
                    const SizedBox(height: 12),

                    // Settings Action Tiles
                    SettingsTile(
                      icon: Icons.tune_rounded,
                      title: "App Preferences & Theme",
                      subtitle: "System theme, language & privacy",
                      onTap: _openSettings,
                    ),
                    const SizedBox(height: 10),
                    SettingsTile(
                      icon: Icons.lock_outline_rounded,
                      title: "Account Security",
                      subtitle: "Email & authenticated session details",
                      onTap: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text("Account security managed via SessionManager.")),
                        );
                      },
                    ),
                    const SizedBox(height: 28),

                    // Logout Action Button
                    SizedBox(
                      width: double.infinity,
                      height: 52,
                      child: OutlinedButton.icon(
                        onPressed: () async {
                          await widget.controller.logout();
                          widget.onLogout?.call();
                        },
                        icon: const Icon(Icons.logout_rounded, color: AppTheme.errorRed),
                        label: const Text(
                          "Log Out Session",
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppTheme.errorRed,
                          ),
                        ),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: AppTheme.errorRed, width: 1.5),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
