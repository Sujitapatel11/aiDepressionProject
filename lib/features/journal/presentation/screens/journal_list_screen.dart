import 'package:flutter/material.dart';
import '../../../../core/theme/app_theme.dart';
import '../../../dashboard/presentation/controllers/dashboard_error_mapper.dart';
import '../../../dashboard/widgets/dashboard_empty_view.dart';
import '../../../dashboard/widgets/dashboard_error_view.dart';
import '../controllers/journal_list_controller.dart';
import '../providers/journal_providers.dart';
import '../state/journal_list_state.dart';
import '../widgets/journal_delete_dialog.dart';
import '../widgets/journal_filter_chips.dart';
import '../widgets/journal_search_bar.dart';
import '../widgets/journal_skeleton_loader.dart';
import '../widgets/journal_timeline_card.dart';
import 'journal_detail_screen.dart';
import 'journal_editor_screen.dart';

/// Presentation view for Journal Timeline screen with search bar, mood filter chips, and floating action button
class JournalListScreen extends StatefulWidget {
  final JournalListController controller;

  const JournalListScreen({
    Key? key,
    required this.controller,
  }) : super(key: key);

  @override
  State<JournalListScreen> createState() => _JournalListScreenState();
}

class _JournalListScreenState extends State<JournalListScreen>
    with AutomaticKeepAliveClientMixin {
  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_onControllerUpdate);
    widget.controller.loadTimeline();
  }

  @override
  void dispose() {
    widget.controller.removeListener(_onControllerUpdate);
    super.dispose();
  }

  void _onControllerUpdate() {
    if (mounted) setState(() {});
  }

  void _openEditorScreen({dynamic entry}) {
    final editorController = JournalProviders.createEditorController();
    if (entry != null) {
      editorController.loadEntry(entry);
    }

    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => JournalEditorScreen(
          controller: editorController,
          onSuccess: () => widget.controller.loadTimeline(),
        ),
      ),
    );
  }

  void _openDetailScreen(entry) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => JournalDetailScreen(
          entry: entry,
          onEdit: () => _openEditorScreen(entry: entry),
          onDelete: () => widget.controller.delete(entry.journalId!),
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
          "Journal Reflections",
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openEditorScreen(),
        backgroundColor: AppTheme.lavenderPrimary,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_rounded),
        label: const Text("New Entry", style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Search & Filter Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Column(
                children: [
                  JournalSearchBar(
                    query: state.searchQuery,
                    onChanged: widget.controller.search,
                    onClear: () => widget.controller.search(''),
                  ),
                  const SizedBox(height: 10),
                  JournalFilterChips(
                    selectedMoodFilter: state.selectedMoodFilter,
                    onMoodSelected: widget.controller.filter,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),

            // Content Body
            Expanded(
              child: Builder(
                builder: (context) {
                  if (state.isLoading && !state.hasData) {
                    return const JournalSkeletonLoader();
                  }

                  if (state.isError && !state.hasData) {
                    return DashboardErrorView(
                      message: DashboardErrorMapper.mapFailureToMessage(null),
                      onRetry: widget.controller.loadTimeline,
                    );
                  }

                  if (state.isEmpty) {
                    return RefreshIndicator(
                      onRefresh: widget.controller.refresh,
                      child: SingleChildScrollView(
                        physics: const AlwaysScrollableScrollPhysics(),
                        child: SizedBox(
                          height: MediaQuery.of(context).size.height * 0.5,
                          child: DashboardEmptyView(
                            title: "No Journal Reflections",
                            message: "Start capturing your thoughts, feelings, and daily reflections.",
                            onAction: () => _openEditorScreen(),
                            actionLabel: "Write First Entry",
                          ),
                        ),
                      ),
                    );
                  }

                  return RefreshIndicator(
                    onRefresh: widget.controller.refresh,
                    color: AppTheme.lavenderPrimary,
                    child: ListView.separated(
                      key: const PageStorageKey('journal_timeline_list'),
                      padding: const EdgeInsets.fromLTRB(20, 8, 20, 80),
                      itemCount: state.filteredEntries.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        final entry = state.filteredEntries[index];
                        return JournalTimelineCard(
                          entry: entry,
                          onTap: () => _openDetailScreen(entry),
                          onEditTap: () => _openEditorScreen(entry: entry),
                          onDeleteTap: () => JournalDeleteDialog.show(
                            context,
                            () => widget.controller.delete(entry.journalId!),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
