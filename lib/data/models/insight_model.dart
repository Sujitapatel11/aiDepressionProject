/// AI Insight Data Model mapping Django Insights API
class InsightModel {
  final int id;
  final String category; // 'cbt', 'sleep', 'emotional_trend', 'mindfulness'
  final String title;
  final String content;
  final String severity; // 'info', 'gentle_nudge', 'important'
  final bool isDismissed;
  final DateTime createdAt;

  const InsightModel({
    required this.id,
    required this.category,
    required this.title,
    required this.content,
    required this.severity,
    required this.isDismissed,
    required this.createdAt,
  });

  factory InsightModel.fromJson(Map<String, dynamic> json) {
    return InsightModel(
      id: json['id'] as int? ?? 0,
      category: json['category'] as String? ?? 'mindfulness',
      title: json['title'] as String? ?? 'Personal Reflection',
      content: json['content'] as String? ?? '',
      severity: json['severity'] as String? ?? 'info',
      isDismissed: json['is_dismissed'] as bool? ?? false,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'] as String)
          : DateTime.now(),
    );
  }
}
