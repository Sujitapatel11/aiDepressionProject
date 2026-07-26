import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/controllers/dashboard_error_mapper.dart';
import '../../../dashboard/presentation/widgets/offline_banner.dart';
import '../../../dashboard/widgets/dashboard_empty_view.dart';
import '../../../dashboard/widgets/dashboard_error_view.dart';
import '../controllers/community_feed_controller.dart';
import '../widgets/community_skeleton_loader.dart';
import '../widgets/peer_user_card.dart';
import '../widgets/support_connection_tile.dart';
import '../widgets/support_request_tile.dart';
import 'peer_detail_screen.dart';

/// Presentation view for Community & Peer Support feed screen
class CommunityFeedScreen extends StatefulWidget {
  final CommunityFeedController controller;

  const CommunityFeedScreen({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  State<CommunityFeedScreen> createState() => _CommunityFeedScreenState();
}

class _CommunityFeedScreenState extends State<CommunityFeedScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.loadFeed();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  void _openPeerDetail(peer) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PeerDetailScreen(
          peer: peer,
          onConnect: () => widget.controller.sendRequest(peer.id),
        ),
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
          "Peer Community & Support",
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
              return const CommunitySkeletonLoader();
            }

            if (state.isError && !state.hasData) {
              return DashboardErrorView(
                message: DashboardErrorMapper.mapFailureToMessage(null),
                onRetry: widget.controller.loadFeed,
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
                      title: "No Peer Matches Available",
                      message: "Peer suggestions will appear as more members join the SoulCare supportive community.",
                      actionLabel: null,
                    ),
                  ),
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: widget.controller.refresh,
              color: AppTheme.lavenderPrimary,
              child: SingleChildScrollView(
                key: const PageStorageKey('community_feed_list'),
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Column(
                  crossAxisAlignment: CrossAlignment.start,
                  children: [
                    if (state.isOffline) const OfflineBanner(),

                    // 1. Incoming Support Requests Section
                    if (state.incomingRequests.isNotEmpty) ...[
                      Text(
                        "Pending Support Requests (${state.incomingRequests.length})",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.textMain,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.incomingRequests.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final req = state.incomingRequests[index];
                          return SupportRequestTile(
                            request: req,
                            onAccept: () => widget.controller.respondToRequest(req.id, accept: true),
                            onReject: () => widget.controller.respondToRequest(req.id, accept: false),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                    ],

                    // 2. Active Connections Section
                    if (state.activeConnections.isNotEmpty) ...[
                      Text(
                        "Connected Support Peers (${state.activeConnections.length})",
                        style: TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.white : AppTheme.textMain,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.activeConnections.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final conn = state.activeConnections[index];
                          return SupportConnectionTile(
                            connection: conn,
                            onDisconnect: () => widget.controller.disconnect(conn.connectionId),
                          );
                        },
                      ),
                      const SizedBox(height: 24),
                    ],

                    // 3. Recommended Peer Matches Section
                    if (state.peerSuggestions.isNotEmpty) ...[
                      Row(
                        children: const [
                          Icon(Icons.psychology_outlined, color: AppTheme.lavenderPrimary, size: 20),
                          SizedBox(width: 8),
                          Text(
                            "RECOMMENDED PEER MATCHES",
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
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: state.peerSuggestions.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final peer = state.peerSuggestions[index];
                          final isPending = state.pendingSentUserIds.contains(peer.id);
                          return PeerUserCard(
                            peer: peer,
                            isPending: isPending,
                            onTap: () => _openPeerDetail(peer),
                            onConnect: () => widget.controller.sendRequest(peer.id),
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
