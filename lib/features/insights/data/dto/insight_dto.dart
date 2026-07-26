import '../../domain/entities/insight_entity.dart';

/// Data Transfer Object parsing `/api/insights/` REST API payload
class InsightDto {
  final int insightId;
  final String title;
  final String message;
  final String? mood;
  final double? sentimentScore;
  final List<String> keywords;
  final List<String> emotionTags;
  final String? createdAt;
  final int? journalId;
  final bool isRead;
  final bool isDismissed;

  const InsightDto({
    required this.insightId,
    required this.title,
    required this.message,
    this.mood,
    this.sentimentScore,
    this.keywords = const [],
    this.emotionTags = const [],
    this.createdAt,
    this.journalId,
    this.isRead = false,
    this.isDismissed = false,
  });

  factory InsightDto.fromJson(Map<String, dynamic> json) {
    return InsightDto(
      insightId: json['insight_id'] as int? ?? json['id'] as int? ?? 0,
      title: json['title'] as String? ?? 'AI Insight',
      message: json['message'] as String? ?? '',
      mood: json['mood'] as String?,
      sentimentScore: (json['sentiment_score'] as num?)?.toDouble(),
      keywords: (json['keywords'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      emotionTags: (json['emotion_tags'] as List?)?.map((e) => e.toString()).toList() ?? const [],
      createdAt: json['created_at'] as String?,
      journalId: json['journal_id'] as int?,
      isRead: json['is_read'] as bool? ?? false,
      isDismissed: json['is_dismissed'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'insight_id': insightId,
      'title': title,
      'message': message,
      if (mood != null) 'mood': mood,
      if (sentimentScore != null) 'sentiment_score': sentimentScore,
      'keywords': keywords,
      'emotion_tags': emotionTags,
      if (createdAt != null) 'created_at': createdAt,
      if (journalId != null) 'journal_id': journalId,
      'is_read': isRead,
      'is_dismissed': isDismissed,
    };
  }

  InsightEntity toEntity() {
    final now = DateTime.now();
    return InsightEntity(
      insightId: insightId,
      title: title,
      message: message,
      mood: mood,
      sentimentScore: sentimentScore,
      keywords: keywords,
      emotionTags: emotionTags,
      createdAt: createdAt != null ? (DateTime.tryParse(createdAt!) ?? now) : now,
      journalId: journalId,
      isRead: isRead,
      isDismissed: isDismissed,
    );
  }
}
