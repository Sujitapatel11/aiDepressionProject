import 'package:flutter/widgets.dart';

import '../../../authentication/presentation/controllers/session_manager.dart';
import '../../domain/repository/dashboard_repository.dart';
import '../state/home_dashboard_state.dart';
import '../utils/greeting_helper.dart';

/// Controller managing state, app lifecycle observers, and repository interactions for Home Dashboard
class HomeDashboardController extends ChangeNotifier with WidgetsBindingObserver {
  final DashboardRepository repository;
  final SessionManager? sessionManager;

  HomeDashboardState _state = const HomeDashboardState();
  HomeDashboardState get state => _state;

  HomeDashboardController({
    required this.repository,
    this.sessionManager,
  }) {
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState appState) {
    if (appState == AppLifecycleState.resumed) {
      _updateGreetingAndDate();
    }
  }

  /// Recalculates time-of-day greeting and date string
  void _updateGreetingAndDate() {
    final now = DateTime.now();
    final greetingStr = GreetingHelper.getGreeting(now);
    final dateStr = GreetingHelper.getFormattedDate(now);

    if (_state.greeting != greetingStr || _state.formattedDate != dateStr) {
      _state = _state.copyWith(
        greeting: greetingStr,
        formattedDate: dateStr,
      );
      notifyListeners();
    }
  }

  /// Loads user session and dashboard summary
  Future<void> loadDashboard() async {
    final now = DateTime.now();
    final greetingStr = GreetingHelper.getGreeting(now);
    final dateStr = GreetingHelper.getFormattedDate(now);

    // Read username exclusively from SessionManager
    String currentUsername = 'Friend';
    if (sessionManager != null && sessionManager!.state.isAuthenticated) {
      final u = sessionManager!.state.user?.username;
      if (u != null && u.trim().isNotEmpty) {
        currentUsername = u.trim();
      }
    }

    if (_state.summary == null) {
      _state = _state.copyWith(
        status: HomeDashboardStatus.loading,
        greeting: greetingStr,
        formattedDate: dateStr,
        userName: currentUsername,
      );
      notifyListeners();
    }

    final result = await repository.getDashboardSummary();

    if (result.failure != null) {
      if (_state.summary != null || result.summary != null) {
        _state = _state.copyWith(
          status: HomeDashboardStatus.data,
          summary: _state.summary ?? result.summary,
          isOffline: true,
          hasCachedData: true,
          greeting: greetingStr,
          formattedDate: dateStr,
          userName: currentUsername,
        );
      } else {
        _state = _state.copyWith(
          status: HomeDashboardStatus.error,
          failure: result.failure,
          isOffline: true,
          hasCachedData: false,
          greeting: greetingStr,
          formattedDate: dateStr,
          userName: currentUsername,
        );
      }
    } else {
      final summary = result.summary;
      final finalUsername = (summary?.username != null &&
              summary!.username.isNotEmpty &&
              summary.username != 'User')
          ? summary.username
          : currentUsername;

      _state = _state.copyWith(
        status: HomeDashboardStatus.data,
        summary: summary,
        failure: null,
        isOffline: false,
        hasCachedData: true,
        greeting: greetingStr,
        formattedDate: dateStr,
        userName: finalUsername,
      );
    }
    notifyListeners();
  }

  /// Refreshes dashboard summary data
  Future<void> refreshDashboard() async {
    _state = _state.copyWith(status: HomeDashboardStatus.refreshing);
    notifyListeners();
    await loadDashboard();
  }

  /// Clears any transient failure state
  void clearError() {
    if (_state.isError) {
      _state = _state.copyWith(status: HomeDashboardStatus.data, failure: null);
      notifyListeners();
    }
  }
}
