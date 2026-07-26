import 'package:flutter/material.dart';

/// Represents a single onboarding page model
class OnboardingItem {
  final int index;
  final String title;
  final String description;
  final String ctaText;
  final Color themeColor;

  const OnboardingItem({
    required this.index,
    required this.title,
    required this.description,
    required this.ctaText,
    required this.themeColor,
  });

  static const List<OnboardingItem> items = [
    OnboardingItem(
      index: 0,
      title: "A safe space for your inner thoughts.",
      description:
          "Express your daily feelings freely in a private, judgment-free sanctuary designed for your emotional growth.",
      ctaText: "Continue",
      themeColor: Color(0xFF7C6EF6),
    ),
    OnboardingItem(
      index: 1,
      title: "Understand your emotional patterns.",
      description:
          "Receive gentle AI insights and actionable coping strategies tailored to your unique mood triggers.",
      ctaText: "Next",
      themeColor: Color(0xFF8DD8C8),
    ),
    OnboardingItem(
      index: 2,
      title: "You are never alone on this journey.",
      description:
          "Connect anonymously with empathetic peers matched by psychological compatibility in a secure, moderated space.",
      ctaText: "Get Started",
      themeColor: Color(0xFFFFD166),
    ),
  ];
}
