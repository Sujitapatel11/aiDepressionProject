import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../domain/entities/dashboard_summary_entity.dart';
import '../../mood/presentation/providers/mood_providers.dart';
import '../../mood/presentation/screens/mood_checkin_screen.dart';
import '../controllers/dashboard_error_mapper.dart';
import '../controllers/home_dashboard_controller.dart';
import '../models/quick_action_item.dart';
import '../state/home_dashboard_state.dart';
import '../widgets/daily_mood_card.dart';
import '../widgets/dashboard_summary_card.dart';
import '../widgets/offline_banner.dart';
import '../widgets/quick_actions_card.dart';
import '../widgets/recent_activity_card.dart';
import '../widgets/streak_card.dart';
import '../widgets/today_insight_card.dart';
import '../widgets/welcome_header.dart';
import '../../widgets/dashboard_error_view.dart';
import '../../widgets/dashboard_offline_view.dart';
import '../../widgets/dashboard_skeleton.dart';

/// Production-ready Home Dashboard Screen with AutomaticKeepAliveClientMixin, RepaintBoundary wrappers, and subtle entry stagger
class HomeDashboardScreen extends StatefulWidget {
  final HomeDashboardController controller;
  final ValueChanged<int>? onTabSelected;
  final VoidCallback? onMoodCheckInRequested;

  const HomeDashboardScreen({
    Key? key,
    required this.controller,
    this.onTabSelected,
    this.onMoodCheckInRequested,
  }) : super(key: key);

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen>
    with AutomaticKeepAliveClientMixin, SingleTickerProviderStateMixin {
  late final AnimationController _animController;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 200),
    );
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.loadDashboard();
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    widget.controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  void _openMoodCheckInScreen() {
    if (widget.onMoodCheckInRequested != null) {
      widget.onMoodCheckInRequested!();
      return;
    }

    final moodController = MoodProviders.createController();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => MoodCheckInScreen(
          controller: moodController,
          onSuccess: () => widget.controller.refreshDashboard(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    final state = widget.controller.state;

    // 1. Loading state without cache
    if (state.isLoading && !state.hasData) {
      return const DashboardSkeleton();
    }

    // 2. Offline state without cache
    if (state.isOfflineMode && !state.hasData) {
      return DashboardOfflineView(
        onRetry: widget.controller.loadDashboard,
      );
    }

    // 3. Error state without cache
    if (state.isError && !state.hasData) {
      return DashboardErrorView(
        message: DashboardErrorMapper.mapFailureToMessage(state.failure),
        onRetry: widget.controller.loadDashboard,
      );
    }

    final summary = state.summary;
    final quickActions = QuickActionItem.defaultActions(
      onNewJournal: () => widget.onTabSelected?.call(1),
      onViewInsights: () => widget.onTabSelected?.call(3),
      onCommunity: () => widget.onTabSelected?.call(2),
      onMoodCheckIn: _openMoodCheckInScreen,
    );

    return RefreshIndicator(
      onRefresh: widget.controller.refreshDashboard,
      color: AppTheme.lavenderPrimary,
      child: FadeTransition(
        opacity: CurvedAnimation(
          parent: _animController,
          curve: Curves.easeOut,
        ),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAlignment.start,
            children: [
              // Subtle Non-Blocking Offline Banner
              if (state.isOfflineMode) const OfflineBanner(),

              // 1. Welcome Header
              RepaintBoundary(
                child: WelcomeHeader(
                  userName: state.userName,
                  userAvatarUrl: state.userAvatarUrl,
                  greeting: state.greeting,
                  formattedDate: state.formattedDate,
                ),
              ),
              const SizedBox(height: 20),

              // 2. Daily Mood Card
              RepaintBoundary(
                child: DailyMoodCard(
                  moodState: summary?.moodState,
                  onMoodCheckIn: _openMoodCheckInScreen,
                ),
              ),
              const SizedBox(height: 16),

              // 3. Current Streak Card
              RepaintBoundary(
                child: StreakCard(
                  activeStreakDays: summary?.activeStreakDays ?? 0,
                ),
              ),
              const SizedBox(height: 16),

              // 4. Today's AI Insight Card
              const RepaintBoundary(
                child: TodayInsightCard(),
              ),
              const SizedBox(height: 20),

              // 5. Quick Actions
              RepaintBoundary(
                child: QuickActionsCard(actions: quickActions),
              ),
              const SizedBox(height: 24),

              // 6. Recent Activity Card
              RepaintBoundary(
                child: RecentActivityCard(
                  latestJournalPreview: summary?.latestJournalPreview,
                  latestJournalCreatedAt: summary?.latestJournalCreatedAt,
                  totalJournalsCount: summary?.journalCount ?? 0,
                  onViewAllTap: () => widget.onTabSelected?.call(1),
                ),
              ),
              const SizedBox(height: 24),

              // 7. Dashboard Summary Card
              RepaintBoundary(
                child: DashboardSummaryCard(
                  journalCount: summary?.journalCount ?? 0,
                  activeConnectionsCount: summary?.activeConnectionsCount ?? 0,
                  pendingRequestsCount: summary?.pendingRequestsCount ?? 0,
                  unreadInsightsCount: summary?.unreadNotificationsCount ?? 0,
                ),
              ),
              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }
}
