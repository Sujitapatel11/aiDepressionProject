import 'package:flutter/material.dart';

/// Pure domain entity representing a selectable mood option
class MoodEntity {
  final String id;
  final String label;
  final String emoji;
  final int score;
  final Color color;

  const MoodEntity({
    required this.id,
    required this.label,
    required this.emoji,
    required this.score,
    required this.color,
  });

  /// Default list of supported dynamic moods matching backend scale
  static List<MoodEntity> defaultMoods() {
    return const [
      MoodEntity(
        id: 'very_happy',
        label: 'Very Happy',
        emoji: '😄',
        score: 5,
        color: Color(0xFF60A5FA),
      ),
      MoodEntity(
        id: 'happy',
        label: 'Happy',
        emoji: '😊',
        score: 4,
        color: Color(0xFF4ADE80),
      ),
      MoodEntity(
        id: 'calm',
        label: 'Calm',
        emoji: '🌿',
        score: 3,
        color: Color(0xFF8DD8C8),
      ),
      MoodEntity(
        id: 'neutral',
        label: 'Neutral',
        emoji: '😐',
        score: 3,
        color: Color(0xFFFACC15),
      ),
      MoodEntity(
        id: 'sad',
        label: 'Sad',
        emoji: '🌧️',
        score: 2,
        color: Color(0xFFFBBF24),
      ),
      MoodEntity(
        id: 'very_sad',
        label: 'Very Sad',
        emoji: '😢',
        score: 1,
        color: Color(0xFFF87171),
      ),
    ];
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is MoodEntity &&
          runtimeType == other.runtimeType &&
          id == other.id;

  @override
  int get hashCode => id.hashCode;
}
