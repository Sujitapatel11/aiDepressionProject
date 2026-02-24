"""
KEYWORD BANK

This file defines human words that indicate experiences
(e.g., fatigue, stress, motivation).

- This is NOT sentiment analysis
- This is NOT AI
- This is a controlled vocabulary
- Safe to edit without touching logic

Rule:
Add words here, never inside extractor logic.
"""
KEYWORDS = {
    "fatigue": ["exhausted", "tired", "drained", "burnt out"],
    "stress": ["overwhelmed", "pressure", "anxious"],
    "focus": ["confused", "lost", "unclear"],
    "motivation": ["motivated", "driven", "hopeful"]
}