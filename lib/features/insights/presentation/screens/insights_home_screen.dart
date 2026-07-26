import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/controllers/dashboard_error_mapper.dart';
import '../../../dashboard/presentation/widgets/offline_banner.dart';
import '../../../dashboard/widgets/dashboard_empty_view.dart';
import '../../../dashboard/widgets/dashboard_error_view.dart';
import '../controllers/insight_list_controller.dart';
import '../widgets/insight_card.dart';
import '../widgets/insight_skeleton_loader.dart';
import 'insight_detail_screen.dart';

/// Presentation view for AI Insights home screen with spotlight insight, history list, and pull-to-refresh
class InsightsHomeScreen extends StatefulWidget {
  final InsightListController controller;

  const InsightsHomeScreen({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  State<InsightsHomeScreen> createState() => _InsightsHomeScreenState();
}

class _InsightsHomeScreenState extends State<InsightsHomeScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.loadInsights();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  void _openDetailScreen(insight) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => InsightDetailScreen(insight: insight),
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
          "AI Insights & Patterns",
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
              return const InsightSkeletonLoader();
            }

            if (state.isError && !state.hasData) {
              return DashboardErrorView(
                message: DashboardErrorMapper.mapFailureToMessage(null),
                onRetry: widget.controller.loadInsights,
              );
            }

            if (state.isEmpty) {
              return RefreshIndicator(
                onRefresh: widget.controller.refresh,
                color: AppTheme.lavenderPrimary,
                child: SingleChildScrollView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  child: SizedBox(
                    height: MediaQuery.of(context).size.height * 0.7,
                    child: DashboardEmptyView(
                      title: "No AI Insights Yet",
                      message: "AI-generated insights will appear here automatically after you log your daily moods and journal reflections.",
                      actionLabel: null,
                    ),
                  ),
                ),
              );
            }

            final spotlight = state.spotlightInsight;
            final history = state.historyInsights;

            return RefreshIndicator(
              onRefresh: widget.controller.refresh,
              color: AppTheme.lavenderPrimary,
              child: SingleChildScrollView(
                key: const PageStorageKey('insights_home_list'),
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAlignment.start,
                  children: [
                    if (state.isOffline) const OfflineBanner(),

                    // Spotlight Insight Section (Guaranteed single hero rendering)
                    if (spotlight != null) ...[
                      Row(
                        children: const [
                          Icon(Icons.stars_rounded, color: AppTheme.lavenderPrimary, size: 20),
                          SizedBox(width: 8),
                          Text(
                            "LATEST SPOTLIGHT INSIGHT",
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.1,
                              color: AppTheme.lavenderPrimary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      InsightCard(
                        insight: spotlight,
                        isSpotlight: true,
                        onTap: () => _openDetailScreen(spotlight),
                        onDismiss: () => widget.controller.dismissInsight(spotlight.insightId),
                      ),
                      const SizedBox(height: 28),
                    ],

                    // History Timeline Section (Strictly excludes spotlight item to prevent item duplication)
                    if (history.isNotEmpty) ...[
                      Text(
                        "Insight History",
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.textMain,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: history.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 16),
                        itemBuilder: (context, index) {
                          final item = history[index];
                          return InsightCard(
                            insight: item,
                            isSpotlight: false,
                            onTap: () => _openDetailScreen(item),
                            onDismiss: () => widget.controller.dismissInsight(item.insightId),
                          );
                        },
                      ),
                    ],
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
