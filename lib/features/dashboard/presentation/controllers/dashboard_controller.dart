import 'package:flutter/material.dart';
import '../../domain/repository/dashboard_repository.dart';
import '../state/dashboard_state.dart';

/// Controller managing Dashboard tab index, pull-to-refresh, and UI states
class DashboardController extends ChangeNotifier {
  final DashboardRepository repository;

  DashboardState _state = const DashboardState();
  DashboardState get state => _state;

  int _currentTabIndex = 0;
  int get currentTabIndex => _currentTabIndex;

  DashboardController({required this.repository});

  void setTab(int index) {
    if (index == _currentTabIndex) return;
    _currentTabIndex = index;
    notifyListeners();
  }

  Future<void> loadDashboardSummary() async {
    _state = _state.copyWith(status: DashboardStatus.loading);
    notifyListeners();

    final result = await repository.getDashboardSummary();
    if (result.failure != null) {
      _state = _state.copyWith(
        status: DashboardStatus.error,
        failure: result.failure,
      );
    } else {
      _state = _state.copyWith(
        status: DashboardStatus.data,
        summary: result.summary,
      );
    }
    notifyListeners();
  }

  Future<void> refreshDashboardSummary() async {
    _state = _state.copyWith(status: DashboardStatus.refreshing);
    notifyListeners();

    final result = await repository.getDashboardSummary();
    if (result.failure != null) {
      _state = _state.copyWith(
        status: DashboardStatus.error,
        failure: result.failure,
      );
    } else {
      _state = _state.copyWith(
        status: DashboardStatus.data,
        summary: result.summary,
      );
    }
    notifyListeners();
  }
}
