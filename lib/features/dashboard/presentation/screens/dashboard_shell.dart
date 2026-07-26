import 'package:flutter/material.dart';
import '../../../../core/config/app_config.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../authentication/presentation/controllers/session_manager.dart';
import '../../../authentication/presentation/providers/auth_providers.dart';

import '../controllers/dashboard_controller.dart';
import '../controllers/dashboard_error_mapper.dart';
import '../providers/dashboard_providers.dart';
import '../../widgets/community_tab_placeholder.dart';
import '../../widgets/dashboard_bottom_navigation.dart';
import '../../widgets/dashboard_error_view.dart';
import '../../widgets/dashboard_offline_view.dart';
import '../../widgets/dashboard_skeleton.dart';
import '../../widgets/home_tab_placeholder.dart';
import '../../widgets/insights_tab_placeholder.dart';
import '../../widgets/journal_tab_placeholder.dart';
import '../../widgets/profile_tab_placeholder.dart';

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
  }

  @override
  void dispose() {
    _controller.dispose();
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
          HomeTabPlaceholder(
            summary: state.summary,
            onRefresh: _controller.refreshDashboardSummary,
          ),
          const JournalTabPlaceholder(),
          const CommunityTabPlaceholder(),
          const InsightsTabPlaceholder(),
          ProfileTabPlaceholder(onLogout: _onLogoutPressed),
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
