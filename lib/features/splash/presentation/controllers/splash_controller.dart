import 'package:flutter/material.dart';
import '../domain/app_initializer.dart';

/// State model for Splash feature initialization
class SplashState {
  final bool isAnimCompleted;
  final InitialDestination? destination;

  const SplashState({
    this.isAnimCompleted = false,
    this.destination,
  });

  SplashState copyWith({
    bool? isAnimCompleted,
    InitialDestination? destination,
  }) {
    return SplashState(
      isAnimCompleted: isAnimCompleted ?? this.isAnimCompleted,
      destination: destination ?? this.destination,
    );
  }
}

/// Controller managing splash visual timeline (2200ms) and async app initialization
class SplashController extends ChangeNotifier {
  final AppInitializer appInitializer;

  SplashState _state = const SplashState();
  SplashState get state => _state;

  SplashController({required this.appInitializer});

  Future<void> initializeSplash({required Function(InitialDestination) onReady}) async {
    // Run initialization logic in parallel with 2200ms animation timer
    final results = await Future.wait([
      appInitializer.determineInitialDestination(),
      Future.delayed(const Duration(milliseconds: 2200)),
    ]);

    final destination = results.first as InitialDestination;

    _state = _state.copyWith(
      isAnimCompleted: true,
      destination: destination,
    );
    notifyListeners();

    onReady(destination);
  }
}
