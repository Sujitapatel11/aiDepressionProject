import 'package:flutter/material.dart';

class MoodController extends ChangeNotifier {
  String _selectedMood = 'calm'; // 'joyful', 'calm', 'anxious', 'sad', 'overwhelmed'
  String get selectedMood => _selectedMood;

  int _intensity = 3; // 1 to 5
  int get intensity => _intensity;

  final Set<String> _selectedTriggers = {'Sleep'};
  Set<String> get selectedTriggers => _selectedTriggers;

  final List<Map<String, String>> moodOptions = const [
    {'id': 'joyful', 'label': 'Joyful', 'emoji': '✨'},
    {'id': 'calm', 'label': 'Calm', 'emoji': '🌿'},
    {'id': 'anxious', 'label': 'Anxious', 'emoji': '🌊'},
    {'id': 'sad', 'label': 'Sad', 'emoji': '🌧️'},
    {'id': 'overwhelmed', 'label': 'Overwhelmed', 'emoji': '⚡'},
  ];

  final List<String> availableTriggers = const [
    'Work',
    'Sleep',
    'Relationships',
    'Health',
    'Family',
    'Finance',
    'Self-Care',
  ];

  void selectMood(String moodId) {
    _selectedMood = moodId;
    notifyListeners();
  }

  void updateIntensity(double val) {
    _intensity = val.round();
    notifyListeners();
  }

  void toggleTrigger(String trigger) {
    if (_selectedTriggers.contains(trigger)) {
      _selectedTriggers.remove(trigger);
    } else {
      _selectedTriggers.add(trigger);
    }
    notifyListeners();
  }

  void reset() {
    _selectedMood = 'calm';
    _intensity = 3;
    _selectedTriggers.clear();
    _selectedTriggers.add('Sleep');
    notifyListeners();
  }
}
