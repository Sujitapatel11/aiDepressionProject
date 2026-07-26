import 'package:flutter/material.dart';
import '../../domain/onboarding_repository.dart';

/// Immutable state model for the Onboarding Feature
class OnboardingState {
  final int currentPageIndex;
  final bool isLastPage;
  final bool isCompleting;

  const OnboardingState({
    this.currentPageIndex = 0,
    this.isLastPage = false,
    this.isCompleting = false,
  });

  OnboardingState copyWith({
    int? currentPageIndex,
    bool? isLastPage,
    bool? isCompleting,
  }) {
    return OnboardingState(
      currentPageIndex: currentPageIndex ?? this.currentPageIndex,
      isLastPage: isLastPage ?? this.isLastPage,
      isCompleting: isCompleting ?? this.isCompleting,
    );
  }
}

/// Onboarding Controller managing UI page state and persistence
class OnboardingController extends ChangeNotifier {
  final OnboardingRepository repository;

  OnboardingState _state = const OnboardingState();
  OnboardingState get state => _state;

  OnboardingController({required this.repository});

  void onPageChanged(int index) {
    _state = _state.copyWith(
      currentPageIndex: index,
      isLastPage: index == 2,
    );
    notifyListeners();
  }

  Future<void> completeOnboarding({required VoidCallback onComplete}) async {
    _state = _state.copyWith(isCompleting: true);
    notifyListeners();

    await repository.setOnboardingCompleted();

    _state = _state.copyWith(isCompleting: false);
    notifyListeners();

    onComplete();
  }
}
