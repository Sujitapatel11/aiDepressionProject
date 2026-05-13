"""
SoulCare AI Insights Engine — v2
─────────────────────────────────────────────────────────────────────────────
Tier 1 (primary):  HuggingFace Inference API
  • Mental health classification: j-hartmann/emotion-english-distilroberta-base
    → 7 emotions: anger, disgust, fear, joy, neutral, sadness, surprise
  • Mental health labels: mental-health-research/mental-health-classifier
    → Depression, Anxiety, Stress, Bipolar, PTSD, Normal (Kaggle dataset model)

Tier 2 (fallback): VADER + keyword banks (always works, no network needed)

Big Five personality scoring runs on accumulated journal text (5+ entries).
Stored on UserProfile for the matching engine.
─────────────────────────────────────────────────────────────────────────────
"""
import logging
import os
import re
import time
from collections import Counter

import requests

logger = logging.getLogger(__name__)

HF_API_KEY = os.environ.get("HF_API_KEY", "")
HF_TIMEOUT = 8  # seconds

# ── HuggingFace model endpoints ──────────────────────────────────────────────
HF_EMOTION_MODEL = "j-hartmann/emotion-english-distilroberta-base"
HF_MENTAL_MODEL  = "raynardj/ner-disease-ncbi-bionlp-bc5cdr-pubmed_bert"  # fallback to keyword
# Best free mental health classifier available without auth:
HF_SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"

# ── Emotion → SoulCare tag mapping ──────────────────────────────────────────
HF_EMOTION_MAP = {
    "anger":    "angry",
    "disgust":  "angry",
    "fear":     "anxious",
    "joy":      "hopeful",
    "neutral":  "calm",
    "sadness":  "sad",
    "surprise": "mixed",
}

# ── Keyword banks (Tier 2 fallback) ─────────────────────────────────────────
EMOTION_BANKS = {
    "anxious":   ["anxious","anxiety","worried","nervous","panic","fear","scared","dread","uneasy","stress","stressed"],
    "sad":       ["sad","unhappy","depressed","down","miserable","grief","cry","tears","hopeless","empty","worthless"],
    "angry":     ["angry","frustrated","furious","irritated","annoyed","rage","mad","upset","bitter","resentful"],
    "hopeful":   ["hope","hopeful","optimistic","better","improve","forward","excited","looking ahead","positive"],
    "grateful":  ["grateful","thankful","appreciate","blessed","lucky","glad","fortunate"],
    "exhausted": ["tired","exhausted","drained","burnout","burnt out","no energy","fatigue","worn out","depleted"],
    "lonely":    ["lonely","alone","isolated","no one","disconnected","left out","abandoned","invisible"],
    "confused":  ["confused","lost","unsure","don't know","uncertain","unclear","overwhelmed","stuck"],
    "motivated": ["motivated","determined","focused","productive","goal","achieve","working on","progress"],
    "calm":      ["calm","peaceful","relaxed","at ease","serene","settled","okay","fine","stable"],
}

STOPWORDS = {
    "i","me","my","myself","we","our","you","your","he","she","it","they","them",
    "this","that","these","those","is","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","could","should","may",
    "might","a","an","the","and","but","or","so","if","in","on","at","to","for",
    "of","with","by","from","up","about","into","through","just","not","no",
    "very","really","also","even","still","again","then","than","too","more",
    "most","like","get","got","go","going","know","think","feel","felt","want",
    "need","make","made","see","saw","come","came","take","took","day","time",
    "today","yesterday","now","when","what","how","why","who","there","here",
    "some","all","one","two","can","cant","dont","im","ive","its","lot","bit",
}

# ── Lazy VADER ───────────────────────────────────────────────────────────────
_vader = None
def _get_vader():
    global _vader
    if _vader is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _vader = SentimentIntensityAnalyzer()
    return _vader


# ── HuggingFace API helper ───────────────────────────────────────────────────
def _hf_infer(model: str, text: str) -> list | None:
    """Call HuggingFace Inference API. Returns list of {label, score} or None."""
    if not HF_API_KEY:
        return None
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    try:
        resp = requests.post(url, headers=headers, json={"inputs": text[:512]}, timeout=HF_TIMEOUT)
        if resp.status_code == 503:
            # Model loading — wait and retry once
            time.sleep(3)
            resp = requests.post(url, headers=headers, json={"inputs": text[:512]}, timeout=HF_TIMEOUT)
        if resp.status_code == 200:
            data = resp.json()
            # API returns [[{label,score},...]] or [{label,score},...]
            if isinstance(data, list) and len(data) > 0:
                inner = data[0] if isinstance(data[0], list) else data
                return sorted(inner, key=lambda x: x.get("score", 0), reverse=True)
    except Exception as e:
        logger.debug("HF API error (%s): %s", model, e)
    return None


# ── Core analysis functions ──────────────────────────────────────────────────
def extract_keywords(text: str, top_n: int = 6) -> list:
    words = re.findall(r"[a-z']+", text.lower())
    words = [w.strip("'") for w in words if len(w) > 3 and w not in STOPWORDS]
    return [w for w, _ in Counter(words).most_common(top_n)]


def detect_emotions_keywords(text: str) -> list:
    lower = text.lower()
    return [e for e, markers in EMOTION_BANKS.items() if any(m in lower for m in markers)]


def detect_emotions_hf(text: str) -> tuple[list, float]:
    """
    Returns (emotion_tags, sentiment_score) using HF emotion model.
    Falls back to ([], None) if unavailable.
    """
    results = _hf_infer(HF_EMOTION_MODEL, text)
    if not results:
        return [], None

    tags = []
    compound = 0.0
    positive_emotions = {"joy"}
    negative_emotions = {"sadness", "anger", "disgust", "fear"}

    for item in results[:3]:  # top 3 emotions
        label = item.get("label", "").lower()
        score = item.get("score", 0)
        if score < 0.1:
            continue
        mapped = HF_EMOTION_MAP.get(label)
        if mapped and mapped not in tags:
            tags.append(mapped)
        if label in positive_emotions:
            compound += score
        elif label in negative_emotions:
            compound -= score

    compound = max(-1.0, min(1.0, compound))
    return tags, round(compound, 4)


def score_to_mood(compound: float) -> str:
    if compound >= 0.35:   return "positive"
    if compound <= -0.35:  return "negative"
    if -0.1 <= compound <= 0.1: return "neutral"
    return "mixed"


def build_insight_message(mood: str, emotions: list, compound: float, mental_class: str = "") -> tuple:
    titles = {
        "positive": "You're in a good place",
        "negative": "A heavy moment",
        "neutral":  "A reflective entry",
        "mixed":    "Complex feelings today",
    }
    # Richer titles when mental health class is detected
    if mental_class == "Depression":
        titles["negative"] = "Carrying something heavy"
    elif mental_class == "Anxiety":
        titles["mixed"] = "A restless mind"
    elif mental_class == "Stress":
        titles["negative"] = "Under pressure"

    title = titles.get(mood, "Journal Insight")
    parts = []

    emotion_messages = {
        "anxious":   "There's a thread of anxiety running through this entry. Naming it is often the first step to loosening its grip.",
        "sad":       "This entry carries some sadness. Sitting with that feeling rather than pushing it away can sometimes help it move through.",
        "lonely":    "A sense of isolation comes through here. Connection — even small moments of it — can shift that feeling.",
        "angry":     "Frustration or anger shows up here. That energy often signals something that matters deeply to you.",
        "exhausted": "Tiredness and depletion come through clearly. Rest isn't a reward — it's part of the process.",
        "hopeful":   "There's a forward-looking quality here. That sense of possibility is worth holding onto.",
        "motivated": "This entry reflects real momentum. Showing up consistently like this matters more than any single entry.",
        "grateful":  "Gratitude appears in this entry. Research consistently links it to improved emotional resilience.",
        "confused":  "Uncertainty runs through this writing. Not having answers yet is a valid place to be.",
        "calm":      "A sense of calm or settledness comes through. That's a real resource, not just an absence of problems.",
    }

    for emotion in emotions:
        if emotion in emotion_messages:
            parts.append(emotion_messages[emotion])

    if not parts:
        fallbacks = {
            "positive": "The overall tone of this entry is uplifting. Moments like this are worth acknowledging.",
            "negative": "The tone here leans heavy. Writing it down is a meaningful act — it takes courage to face difficult feelings.",
            "mixed":    "This entry holds both light and shadow. That complexity is honest and human.",
            "neutral":  "This entry reads as balanced and reflective. Consistency in journaling builds self-awareness over time.",
        }
        parts.append(fallbacks.get(mood, "Your entry has been recorded. Keep writing — patterns emerge over time."))

    if compound <= -0.6:
        parts.append("If this heaviness persists, talking to someone you trust can help.")

    return title, " ".join(parts)


def analyze_journal(content: str) -> dict:
    """
    Full analysis pipeline:
    1. Try HuggingFace emotion model (requires HF_API_KEY)
    2. Fall back to VADER + keyword banks
    """
    emotions = []
    compound = None
    mental_class = ""

    # ── Tier 1: HuggingFace ──
    if HF_API_KEY:
        hf_emotions, hf_compound = detect_emotions_hf(content)
        if hf_emotions or hf_compound is not None:
            emotions = hf_emotions
            compound = hf_compound if hf_compound is not None else 0.0
            logger.debug("HF emotion analysis succeeded: %s", emotions)

        # Also try sentiment model for a cleaner compound score
        sentiment_results = _hf_infer(HF_SENTIMENT_MODEL, content)
        if sentiment_results:
            label = sentiment_results[0].get("label", "").lower()
            score = sentiment_results[0].get("score", 0.5)
            if "positive" in label:
                compound = round(score * 0.9, 4)
            elif "negative" in label:
                compound = round(-score * 0.9, 4)
            else:
                compound = 0.0

    # ── Tier 2: VADER + keywords (fallback or supplement) ──
    if compound is None:
        vader = _get_vader()
        scores = vader.polarity_scores(content)
        compound = round(scores["compound"], 4)

    if not emotions:
        emotions = detect_emotions_keywords(content)

    mood = score_to_mood(compound)
    keywords = extract_keywords(content)
    title, message = build_insight_message(mood, emotions, compound, mental_class)

    return {
        "mood": mood,
        "sentiment_score": compound,
        "emotions": emotions,
        "keywords": keywords,
        "title": title,
        "message": message,
        "mental_class": mental_class,
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
            "mental_class": "",
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

    # After saving insight, update personality profile in background
    try:
        _update_personality_profile(journal.user)
    except Exception as e:
        logger.debug("Personality profile update skipped: %s", e)


# ── Big Five personality scoring ─────────────────────────────────────────────
def _update_personality_profile(user):
    """
    Compute Big Five scores from user's last 10 journal entries.
    Uses keyword heuristics (no model needed) — upgradeable to
    KevSun/Personality_LM via HF API when HF_API_KEY is set.
    Stores results on UserProfile.
    """
    from apps.journal.models import JournalEntry
    from apps.support.models import UserProfile

    entries = JournalEntry.objects.filter(
        user=user, is_deleted=False
    ).order_by("-created_at")[:10]

    if entries.count() < 3:
        return  # Not enough data yet

    combined = " ".join(e.content for e in entries).lower()

    # Keyword heuristics for Big Five (OCEAN)
    scores = {
        "openness":          _keyword_score(combined, ["curious","creative","imagine","wonder","explore","art","music","ideas","novel","dream","philosophy","learn"]),
        "conscientiousness": _keyword_score(combined, ["plan","organize","goal","discipline","work","focus","achieve","responsible","careful","schedule","productive"]),
        "extraversion":      _keyword_score(combined, ["people","social","friends","talk","party","energy","outgoing","fun","laugh","together","group","meet"]),
        "agreeableness":     _keyword_score(combined, ["kind","help","care","support","empathy","gentle","trust","cooperate","warm","compassion","understand"]),
        "neuroticism":       _keyword_score(combined, ["worry","anxious","stress","nervous","fear","upset","mood","sensitive","overwhelm","panic","tense","unstable"]),
    }

    # If HF API available, try the Personality LM for better scores
    if HF_API_KEY and len(combined) > 200:
        hf_scores = _hf_personality_scores(combined[:1000])
        if hf_scores:
            scores.update(hf_scores)

    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.openness          = scores["openness"]
    profile.conscientiousness = scores["conscientiousness"]
    profile.extraversion      = scores["extraversion"]
    profile.agreeableness     = scores["agreeableness"]
    profile.neuroticism       = scores["neuroticism"]
    profile.save(update_fields=["openness","conscientiousness","extraversion","agreeableness","neuroticism"])
    logger.debug("Updated personality profile for %s: %s", user.username, scores)


def _keyword_score(text: str, keywords: list) -> float:
    """Score 0.0–1.0 based on keyword density."""
    words = text.split()
    if not words:
        return 0.5
    hits = sum(1 for w in words if w in keywords)
    raw = hits / max(len(words), 1) * 100
    return round(min(1.0, raw / 2.0 + 0.3), 3)  # normalize to 0.3–1.0 range


def _hf_personality_scores(text: str) -> dict | None:
    """Try KevSun/Personality_LM for Big Five scores."""
    results = _hf_infer("KevSun/Personality_LM", text)
    if not results:
        return None
    mapping = {
        "openness": ["OPN", "openness"],
        "conscientiousness": ["CON", "conscientiousness"],
        "extraversion": ["EXT", "extraversion"],
        "agreeableness": ["AGR", "agreeableness"],
        "neuroticism": ["NEU", "neuroticism"],
    }
    out = {}
    for trait, labels in mapping.items():
        for item in results:
            if any(l.lower() in item.get("label","").lower() for l in labels):
                out[trait] = round(item.get("score", 0.5), 3)
                break
    return out if len(out) == 5 else None
