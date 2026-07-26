import '../../domain/entities/personality_profile_entity.dart';

/// Data Transfer Object parsing `/api/support/personality/` REST API payload
class PersonalityProfileDto {
  final double openness;
  final double conscientiousness;
  final double extraversion;
  final double agreeableness;
  final double neuroticism;
  final String dominantEmotion;
  final String? updatedAt;
  final bool hasData;

  const PersonalityProfileDto({
    this.openness = 0.5,
    this.conscientiousness = 0.5,
    this.extraversion = 0.5,
    this.agreeableness = 0.5,
    this.neuroticism = 0.5,
    this.dominantEmotion = 'neutral',
    this.updatedAt,
    this.hasData = false,
  });

  factory PersonalityProfileDto.fromJson(Map<String, dynamic> json) {
    return PersonalityProfileDto(
      openness: (json['openness'] as num?)?.toDouble() ?? 0.5,
      conscientiousness: (json['conscientiousness'] as num?)?.toDouble() ?? 0.5,
      extraversion: (json['extraversion'] as num?)?.toDouble() ?? 0.5,
      agreeableness: (json['agreeableness'] as num?)?.toDouble() ?? 0.5,
      neuroticism: (json['neuroticism'] as num?)?.toDouble() ?? 0.5,
      dominantEmotion: json['dominant_emotion'] as String? ?? 'neutral',
      updatedAt: json['updated_at'] as String?,
      hasData: json['has_data'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'openness': openness,
      'conscientiousness': conscientiousness,
      'extraversion': extraversion,
      'agreeableness': agreeableness,
      'neuroticism': neuroticism,
      'dominant_emotion': dominantEmotion,
      if (updatedAt != null) 'updated_at': updatedAt,
      'has_data': hasData,
    };
  }

  PersonalityProfileEntity toEntity() {
    return PersonalityProfileEntity(
      openness: openness,
      conscientiousness: conscientiousness,
      extraversion: extraversion,
      agreeableness: agreeableness,
      neuroticism: neuroticism,
      dominantEmotion: dominantEmotion,
      updatedAt: updatedAt != null ? DateTime.tryParse(updatedAt!) : null,
      hasData: hasData,
    );
  }
}
