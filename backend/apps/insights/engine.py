"""
NLP + Sentiment insight engine using VADER + TextBlob.
No diagnosis. Reflective, supportive language only.
"""
import logging
import re
from collections import Counter

logger = logging.getLogger(__name__)

# ── Lazy-load NLP tools ──────────────────────────────────────────────────────
_vader = None
def _get_vader():
    global _vader
    if _vader is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _vader = SentimentIntensityAnalyzer()
    return _vader


# ── Emotion keyword banks ────────────────────────────────────────────────────
EMOTION_BANKS = {
    "anxious":    ["anxious", "anxiety", "worried", "nervous", "panic", "fear", "scared", "dread", "uneasy"],
    "sad":        ["sad", "unhappy", "depressed", "down", "miserable", "grief", "cry", "tears", "hopeless", "empty"],
    "angry":      ["angry", "frustrated", "furious", "irritated", "annoyed", "rage", "mad", "upset"],
    "hopeful":    ["hope", "hopeful", "optimistic", "better", "improve", "forward", "looking ahead", "excited"],
    "grateful":   ["grateful", "thankful", "appreciate", "blessed", "lucky", "glad"],
    "exhausted":  ["tired", "exhausted", "drained", "burnout", "burnt out", "no energy", "fatigue", "worn out"],
    "lonely":     ["lonely", "alone", "isolated", "no one", "disconnected", "left out"],
    "confused":   ["confused", "lost", "unsure", "don't know", "uncertain", "unclear", "overwhelmed"],
    "motivated":  ["motivated", "determined", "focused", "productive", "goal", "achieve", "working on"],
    "calm":       ["calm", "peaceful", "relaxed", "at ease", "serene", "settled", "okay"],
}

# ── Stopwords (minimal, no NLTK download needed) ────────────────────────────
STOPWORDS = {
    "i", "me", "my", "myself", "we", "our", "you", "your", "he", "she", "it",
    "they", "them", "this", "that", "these", "those", "is", "are", "was", "were",
    "be", "been", "being", "have", "has", "had", "do", "does", "did", "will",
    "would", "could", "should", "may", "might", "a", "an", "the", "and", "but",
    "or", "so", "if", "in", "on", "at", "to", "for", "of", "with", "by", "from",
    "up", "about", "into", "through", "just", "not", "no", "very", "really",
    "also", "even", "still", "again", "then", "than", "too", "more", "most",
    "like", "get", "got", "go", "going", "know", "think", "feel", "felt", "want",
    "need", "make", "made", "see", "saw", "come", "came", "take", "took", "day",
    "time", "today", "yesterday", "now", "when", "what", "how", "why", "who",
    "there", "here", "some", "all", "one", "two", "can", "cant", "dont", "im",
    "ive", "its", "thats", "its", "lot", "bit", "much", "many", "every", "always",
}


def extract_keywords(text: str, top_n: int = 6) -> list[str]:
    """Extract meaningful keywords by frequency, excluding stopwords."""
    words = re.findall(r"[a-z']+", text.lower())
    words = [w.strip("'") for w in words if len(w) > 3 and w not in STOPWORDS]
    freq = Counter(words)
    return [w for w, _ in freq.most_common(top_n)]


def detect_emotions(text: str) -> list[str]:
    """Return list of detected emotion tags from keyword banks."""
    lower = text.lower()
    found = []
    for emotion, markers in EMOTION_BANKS.items():
        if any(m in lower for m in markers):
            found.append(emotion)
    return found


def score_to_mood(compound: float) -> str:
    """Convert VADER compound score to mood label."""
    if compound >= 0.35:
        return "positive"
    elif compound <= -0.35:
        return "negative"
    elif -0.1 <= compound <= 0.1:
        return "neutral"
    else:
        return "mixed"


def build_insight_message(mood: str, emotions: list[str], compound: float, text: str) -> tuple[str, str]:
    """Return (title, message) based on NLP analysis."""

    # Title based on mood
    titles = {
        "positive": "You're in a good place",
        "negative": "A heavy moment",
        "neutral":  "A reflective entry",
        "mixed":    "Complex feelings today",
    }
    title = titles.get(mood, "Journal Insight")

    # Build message from emotions + mood
    parts = []

    if "anxious" in emotions:
        parts.append("There's a thread of anxiety running through this entry. Naming it is often the first step to loosening its grip.")
    if "sad" in emotions or "lonely" in emotions:
        parts.append("This entry carries some sadness. Sitting with that feeling rather than pushing it away can sometimes help it move through.")
    if "angry" in emotions:
        parts.append("Frustration or anger shows up here. That energy often signals something that matters to you.")
    if "exhausted" in emotions:
        parts.append("Tiredness and depletion come through clearly. Rest isn't a reward — it's part of the process.")
    if "hopeful" in emotions or "motivated" in emotions:
        parts.append("There's a forward-looking quality here. That sense of possibility is worth holding onto.")
    if "grateful" in emotions:
        parts.append("Gratitude appears in this entry. Research consistently links it to improved emotional resilience.")
    if "confused" in emotions:
        parts.append("Uncertainty runs through this writing. Not having answers yet is a valid place to be.")
    if "calm" in emotions:
        parts.append("A sense of calm or settledness comes through. That's a real resource, not just an absence of problems.")

    # Fallback by mood if no specific emotions matched
    if not parts:
        if mood == "positive":
            parts.append("The overall tone of this entry is uplifting. Moments like this are worth acknowledging.")
        elif mood == "negative":
            parts.append("The tone here leans heavy. Writing it down is a meaningful act — it takes courage to face difficult feelings.")
        elif mood == "mixed":
            parts.append("This entry holds both light and shadow. That complexity is honest and human.")
        else:
            parts.append("This entry reads as balanced and reflective. Consistency in journaling builds self-awareness over time.")

    # Add sentiment context
    if compound >= 0.6:
        parts.append("The overall sentiment is notably positive.")
    elif compound <= -0.6:
        parts.append("The overall sentiment is notably low. If this persists, talking to someone you trust can help.")

    return title, " ".join(parts)


def analyze_journal(content: str) -> dict:
    """Full NLP analysis of journal content. Returns dict of results."""
    vader = _get_vader()
    scores = vader.polarity_scores(content)
    compound = scores["compound"]
    mood = score_to_mood(compound)
    emotions = detect_emotions(content)
    keywords = extract_keywords(content)
    title, message = build_insight_message(mood, emotions, compound, content)

    return {
        "mood": mood,
        "sentiment_score": round(compound, 4),
        "emotions": emotions,
        "keywords": keywords,
        "title": title,
        "message": message,
    }


def create_insight_from_journal(journal):
    from .models import Insight

    if Insight.objects.filter(journal=journal).exists():
        return

    try:
        result = analyze_journal(journal.content)
    except Exception as e:
        logger.warning("NLP analysis failed, using fallback: %s", e)
        result = {
            "mood": "neutral",
            "sentiment_score": 0.0,
            "emotions": [],
            "keywords": [],
            "title": "Journal Insight",
            "message": "Your entry has been recorded. Keep writing — patterns emerge over time.",
        }

    Insight.objects.create(
        user=journal.user,
        journal=journal,
        title=result["title"],
        message=result["message"],
        mood=result["mood"],
        sentiment_score=result["sentiment_score"],
        emotion_tags=result["emotions"],
        keywords=result["keywords"],
        source_window_start=journal.created_at,
        source_window_end=journal.created_at,
    )
