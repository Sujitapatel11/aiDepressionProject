/// Pure domain entity representing user's Big Five personality traits
class PersonalityProfileEntity {
  final double openness;
  final double conscientiousness;
  final double extraversion;
  final double agreeableness;
  final double neuroticism;
  final String dominantEmotion;
  final DateTime? updatedAt;
  final bool hasData;

  const PersonalityProfileEntity({
    this.openness = 0.5,
    this.conscientiousness = 0.5,
    this.extraversion = 0.5,
    this.agreeableness = 0.5,
    this.neuroticism = 0.5,
    this.dominantEmotion = 'neutral',
    this.updatedAt,
    this.hasData = false,
  });
}
