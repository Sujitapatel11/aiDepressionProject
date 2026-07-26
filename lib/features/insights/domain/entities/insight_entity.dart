/// Pure domain entity representing an AI-generated insight
class InsightEntity {
  final int insightId;
  final String title;
  final String message;
  final String? mood;
  final double? sentimentScore;
  final List<String> keywords;
  final List<String> emotionTags;
  final DateTime createdAt;
  final int? journalId;
  final bool isRead;
  final bool isDismissed;

  const InsightEntity({
    required this.insightId,
    required this.title,
    required this.message,
    this.mood,
    this.sentimentScore,
    this.keywords = const [],
    this.emotionTags = const [],
    required this.createdAt,
    this.journalId,
    this.isRead = false,
    this.isDismissed = false,
  });

  InsightEntity copyWith({
    int? insightId,
    String? title,
    String? message,
    String? mood,
    double? sentimentScore,
    List<String>? keywords,
    List<String>? emotionTags,
    DateTime? createdAt,
    int? journalId,
    bool? isRead,
    bool? isDismissed,
  }) {
    return InsightEntity(
      insightId: insightId ?? this.insightId,
      title: title ?? this.title,
      message: message ?? this.message,
      mood: mood ?? this.mood,
      sentimentScore: sentimentScore ?? this.sentimentScore,
      keywords: keywords ?? this.keywords,
      emotionTags: emotionTags ?? this.emotionTags,
      createdAt: createdAt ?? this.createdAt,
      journalId: journalId ?? this.journalId,
      isRead: isRead ?? this.isRead,
      isDismissed: isDismissed ?? this.isDismissed,
    );
  }
}
