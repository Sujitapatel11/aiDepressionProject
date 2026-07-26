import 'package:flutter/material.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../authentication/presentation/controllers/session_manager.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';
import '../../community/presentation/controllers/community_feed_controller.dart';
import '../../community/presentation/providers/community_providers.dart';
import '../../community/presentation/screens/community_feed_screen.dart';
import '../../insights/presentation/controllers/insight_list_controller.dart';
import '../../insights/presentation/providers/insight_providers.dart';
import '../../insights/presentation/screens/insights_home_screen.dart';
import '../../journal/presentation/controllers/journal_list_controller.dart';
import '../../journal/presentation/providers/journal_providers.dart';
import '../../journal/presentation/screens/journal_list_screen.dart';
import '../../profile/presentation/controllers/profile_controller.dart';
import '../../profile/presentation/providers/profile_providers.dart';
import '../../profile/presentation/screens/profile_screen.dart';

import '../controllers/dashboard_controller.dart';
import '../controllers/dashboard_error_mapper.dart';
import '../controllers/home_dashboard_controller.dart';
import '../providers/dashboard_providers.dart';
import 'home_dashboard_screen.dart';
import '../../widgets/dashboard_bottom_navigation.dart';
import '../../widgets/dashboard_error_view.dart';
import '../../widgets/dashboard_offline_view.dart';
import '../../widgets/dashboard_skeleton.dart';

/// ════════════════════════════════════════════════════════════════════════════
/// SOULCARE DASHBOARD SHELL (PRODUCTION REFACTORED NAVIGATION SHELL)
/// ════════════════════════════════════════════════════════════════════════════

class SoulCareDashboardShellFeature extends StatefulWidget {
  final AppConfig config;

  const SoulCareDashboardShellFeature({
    Key? key,
    this.config = AppConfig.local,
  }) : super(key: key);

  @override
  State<SoulCareDashboardShellFeature> createState() =>
      _SoulCareDashboardShellFeatureState();
}

class _SoulCareDashboardShellFeatureState
    extends State<SoulCareDashboardShellFeature> {
  late final DashboardController _controller;
  late final HomeDashboardController _homeController;
  late final JournalListController _journalListController;
  late final CommunityFeedController _communityFeedController;
  late final InsightListController _insightListController;
  late final ProfileController _profileController;
  late final SessionManager _sessionManager;

  @override
  void initState() {
    super.initState();

    final repository = DashboardProviders.repository(config: widget.config);
    final authRepo = AuthProviders.repository(config: widget.config);
    final secureStorage = AuthProviders.secureStorage;

    _sessionManager = SessionManager(
      repository: authRepo,
      secureStorage: secureStorage,
    );

    _controller = DashboardController(repository: repository);
    _controller.addListener(() => setState(() {}));
    _controller.loadDashboardSummary();

    _homeController = HomeDashboardController(
      repository: repository,
      sessionManager: _sessionManager,
    );

    _journalListController = JournalProviders.createListController(config: widget.config);
    _communityFeedController = CommunityProviders.createFeedController(config: widget.config);
    _insightListController = InsightProviders.createListController(config: widget.config);
    _profileController = ProfileProviders.createProfileController(config: widget.config);
  }

  @override
  void dispose() {
    _profileController.dispose();
    _communityFeedController.dispose();
    _insightListController.dispose();
    _journalListController.dispose();
    _controller.dispose();
    _homeController.dispose();
    super.dispose();
  }

  Future<void> _onLogoutPressed() async {
    await _sessionManager.logout();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final state = _controller.state;

    Widget currentBody;

    if (state.isLoading) {
      currentBody = const DashboardSkeleton();
    } else if (state.isOffline) {
      currentBody = DashboardOfflineView(
        onRetry: _controller.loadDashboardSummary,
      );
    } else if (state.isError) {
      currentBody = DashboardErrorView(
        message: DashboardErrorMapper.mapFailureToMessage(state.failure),
        onRetry: _controller.loadDashboardSummary,
      );
    } else {
      currentBody = IndexedStack(
        index: _controller.currentTabIndex,
        children: [
          HomeDashboardScreen(
            controller: _homeController,
            onTabSelected: _controller.setTab,
          ),
          JournalListScreen(controller: _journalListController),
          CommunityFeedScreen(controller: _communityFeedController),
          InsightsHomeScreen(controller: _insightListController),
          ProfileScreen(
            controller: _profileController,
            onLogout: _onLogoutPressed,
          ),
        ],
      );
    }

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : AppTheme.appBackground,
      body: SafeArea(child: currentBody),
      bottomNavigationBar: DashboardBottomNavigation(
        selectedIndex: _controller.currentTabIndex,
        onDestinationSelected: _controller.setTab,
      ),
    );
  }
}
