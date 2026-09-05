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
HF_LLM_TIMEOUT = 15  # seconds for generative LLM
HF_GEN_MODEL = "Qwen/Qwen2.5-7B-Instruct"

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


# ── HuggingFace API helpers ──────────────────────────────────────────────────
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


def _hf_generate_llm_insight(text: str) -> dict | None:
    """
    Generate an intelligent, context-aware journal insight using HF Inference API.
    Returns dict with keys: title, message, mood, emotions, or None on failure/timeout.
    """
    if not HF_API_KEY:
        return None

    model = os.environ.get("HF_MODEL", HF_GEN_MODEL)
    url = f"https://api-inference.huggingface.co/models/{model}"
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }

    system_instructions = (
        "You are SoulCare, an empathetic, gentle, and supportive AI journal companion. "
        "Your task is to read the user's private journal entry and generate a thoughtful, validating insight.\n\n"
        "STRICT SAFETY & BEHAVIORAL RULES:\n"
        "1. NEVER use medical, psychiatric, or diagnostic terms (e.g., do NOT diagnose depression, bipolar, anxiety disorders, PTSD).\n"
        "2. NEVER give medical or crisis advice (crisis resources are displayed separately).\n"
        "3. Tone: Warm, compassionate, reflective, and validating.\n"
        "4. Return strictly a JSON object with no markdown surrounding text outside the JSON.\n\n"
        "JSON SCHEMA:\n"
        "{\n"
        '  "title": "Short compassionate title (3-6 words)",\n'
        '  "message": "2-4 sentences of warm, reflective insight noticing feelings or patterns gently.",\n'
        '  "mood": "positive" | "negative" | "neutral" | "mixed",\n'
        '  "emotions": ["emotion1", "emotion2"]\n'
        "}"
    )

    prompt = f"<|im_start|>system\n{system_instructions}<|im_end|>\n<|im_start|>user\nJournal Entry:\n\"\"\"{text[:1500]}\"\"\"<|im_end|>\n<|im_start|>assistant\n{{\n"

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 250,
            "temperature": 0.6,
            "return_full_text": False,
        }
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=HF_LLM_TIMEOUT)
        if resp.status_code == 503:
            logger.info("HF model %s cold loading (503). Retrying in 4s...", model)
            time.sleep(4)
            resp = requests.post(url, headers=headers, json=payload, timeout=HF_LLM_TIMEOUT)

        if resp.status_code == 200:
            data = resp.json()
            generated_text = ""
            if isinstance(data, list) and len(data) > 0:
                generated_text = data[0].get("generated_text", "")
            elif isinstance(data, dict):
                generated_text = data.get("generated_text", "") or data.get("choices", [{}])[0].get("message", {}).get("content", "")

            if generated_text and not generated_text.strip().startswith("{"):
                generated_text = "{\n" + generated_text

            parsed = _parse_json_insight(generated_text)
            if parsed and parsed.get("title") and parsed.get("message"):
                return parsed

    except Exception as e:
        logger.warning("HF LLM insight generation failed (%s): %s", model, e)

    return None


def _parse_json_insight(text: str) -> dict | None:
    """Extract and validate JSON object from LLM response text."""
    import json
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        return None
    try:
        data = json.loads(match.group(0))
        if not isinstance(data, dict):
            return None

        title = str(data.get("title", "")).strip()
        message = str(data.get("message", "")).strip()
        mood = str(data.get("mood", "")).strip().lower()
        emotions = data.get("emotions", [])

        if not title or not message:
            return None

        if mood not in {"positive", "negative", "neutral", "mixed"}:
            mood = "neutral"

        if not isinstance(emotions, list):
            emotions = []
        emotions = [str(e).strip().lower() for e in emotions if isinstance(e, str)][:4]

        return {
            "title": title,
            "message": message,
            "mood": mood,
            "emotions": emotions,
        }
    except Exception as e:
        logger.debug("Failed to parse JSON insight from text: %s", e)
        return None


# ── Input Validation & Mood Prefix Extraction ────────────────────────────────
def _extract_mood_prefix(content: str) -> tuple[str | None, str]:
    """
    Parse and strip '[Feeling <Mood>]' tag prefix from journal content.
    Returns (extracted_mood, free_text).
    """
    if not content:
        return None, ""
    match = re.match(r"^\s*\[Feeling\s+([^\]]+)\]\s*", content, re.IGNORECASE)
    if match:
        extracted_mood = match.group(1).strip().lower()
        free_text = content[match.end():].strip()
        return extracted_mood, free_text
    return None, content.strip()


def _validate_journal_content(content: str) -> tuple[str, str, str | None]:
    """
    Validates journal text and classifies into one of three states:
    - 'too_short': empty or fewer than ~12 words of actual text after mood prefix.
    - 'invalid': content containing code syntax, URLs, commands, stack traces, or symbol ratio > 22%.
    - 'sufficient': genuine, meaningful journaling text.

    Returns (status, free_text, extracted_mood).
    """
    extracted_mood, free_text = _extract_mood_prefix(content)

    if not free_text:
        return "too_short", free_text, extracted_mood

    words = re.findall(r"\b[\w'-]+\b", free_text)
    word_count = len(words)

    # Check 1: Too short (< 12 words)
    if word_count < 12:
        return "too_short", free_text, extracted_mood

    # Check 2: Invalid content (Code, URLs, Commands, High Symbol Density)
    # A. URL detection
    if re.search(r"https?://|ftp://|www\.[a-z0-9-]+\.", free_text, re.IGNORECASE):
        if word_count < 25 or len(re.findall(r"https?://\S+", free_text)) > 0:
            return "invalid", free_text, extracted_mood

    # B. Programming code keywords & syntax patterns
    code_keywords = {
        "def ", "function ", "import ", "from ", "class ", "const ", "let ", "var ",
        "return ", "public static ", "void ", "console.log", "print(", "fmt.print",
        "select ", "insert into", "delete from", "update ", "where ", "group by",
        "export default", "npm install", "pip install", "git commit", "docker run",
        "sudo ", "chmod ", "apt-get", "system.out"
    }
    lower_text = free_text.lower()
    code_hits = sum(1 for kw in code_keywords if kw in lower_text)
    code_syntax = re.findall(r"[{}\[\];=><+\-*/\\|~^`$%]", free_text)

    # Non-alphanumeric ratio (excluding normal whitespace & basic punctuation . , ! ? ' " -)
    cleaned_normal = re.sub(r"[\w\s.,!?'\"-]", "", free_text)
    symbol_ratio = len(cleaned_normal) / max(len(free_text), 1)

    if code_hits >= 2 or symbol_ratio > 0.22 or (code_hits >= 1 and len(code_syntax) >= 4):
        return "invalid", free_text, extracted_mood

    return "sufficient", free_text, extracted_mood


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
    1. Validate input text & strip mood tag prefix.
    2. Handle 'too_short' and 'invalid' states with dedicated friendly messages.
    3. For 'sufficient' text:
       a. Try HuggingFace generative LLM model (requires HF_API_KEY)
       b. Fall back to VADER + keyword banks
    """
    status_code, free_text, tag_mood = _validate_journal_content(content)

    vader = _get_vader()
    vader_scores = vader.polarity_scores(free_text if free_text else content)
    vader_compound = round(vader_scores["compound"], 4)

    # ── State 1: Too Short ──
    if status_code == "too_short":
        mood = tag_mood if tag_mood in {"positive", "negative", "neutral", "mixed"} else score_to_mood(vader_compound)
        return {
            "mood": mood,
            "sentiment_score": vader_compound,
            "emotions": [tag_mood] if tag_mood else [],
            "keywords": extract_keywords(free_text) if free_text else [],
            "title": "A Starting Reflection",
            "message": "Try writing a bit more about what's behind this feeling for a deeper AI insight.",
            "status": "too_short",
            "mental_class": "",
        }

    # ── State 2: Invalid Content (Code, URLs, Commands) ──
    if status_code == "invalid":
        return {
            "mood": "neutral",
            "sentiment_score": 0.0,
            "emotions": [],
            "keywords": [],
            "title": "Entry Content Note",
            "message": "This entry appears to contain code, URLs, or system text rather than personal reflections. Share your thoughts or feelings to receive AI companion insights.",
            "status": "invalid",
            "mental_class": "",
        }

    # ── State 3: Sufficient Text (Normal Analysis) ──
    # Tier 1: HuggingFace Generative LLM
    if HF_API_KEY:
        llm_result = _hf_generate_llm_insight(free_text)
        if llm_result:
            logger.info("HF LLM insight generation succeeded")
            keywords = extract_keywords(free_text)
            return {
                "mood": llm_result.get("mood", score_to_mood(vader_compound)),
                "sentiment_score": vader_compound,
                "emotions": llm_result.get("emotions", []),
                "keywords": keywords,
                "title": llm_result.get("title", "Journal Insight"),
                "message": llm_result.get("message", ""),
                "status": "sufficient",
                "mental_class": "",
            }

    # Tier 2: VADER + keywords (fallback)
    emotions = detect_emotions_keywords(free_text)
    if tag_mood and tag_mood not in emotions and tag_mood in EMOTION_BANKS:
        emotions.append(tag_mood)
    mood = score_to_mood(vader_compound)
    keywords = extract_keywords(free_text)
    title, message = build_insight_message(mood, emotions, vader_compound, mental_class="")

    return {
        "mood": mood,
        "sentiment_score": vader_compound,
        "emotions": emotions,
        "keywords": keywords,
        "title": title,
        "message": message,
        "status": "sufficient",
        "mental_class": "",
    }


def create_insight_from_journal(journal, request_id=None):
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
            "status": "sufficient",
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
        status=result.get("status", "sufficient"),
        source_window_start=journal.created_at,
        source_window_end=journal.created_at,
    )

    # After saving insight, update personality profile in background
    try:
        _update_personality_profile(journal.user, request_id=request_id)
    except Exception as e:
        req_label = request_id or "sys"
        logger.warning("[PERF_AUDIT][%s] Stage: Personality Profile Update | Status: Exception | ExceptionType: %s", req_label, type(e).__name__)


# ── Big Five personality scoring ─────────────────────────────────────────────
def _update_personality_profile(user, request_id=None):
    """
    Compute Big Five scores from user's last 10 journal entries.
    Uses keyword heuristics (no model needed) — upgradeable to
    KevSun/Personality_LM via HF API when HF_API_KEY is set.
    Stores results on UserProfile.
    """
    from apps.journal.models import JournalEntry
    from apps.support.models import UserProfile

    req_label = request_id or "sys"
    t_prof_start = time.perf_counter()

    entries = list(JournalEntry.objects.filter(
        user=user, is_deleted=False
    ).order_by("-created_at")[:10])

    if len(entries) < 3:
        return  # Not enough data yet

    combined = " ".join(e.content for e in entries).lower()

    # Keyword heuristics for Big Five (OCEAN)
    t_kw_start = time.perf_counter()
    scores = {
        "openness":          _keyword_score(combined, ["curious","creative","imagine","wonder","explore","art","music","ideas","novel","dream","philosophy","learn"]),
        "conscientiousness": _keyword_score(combined, ["plan","organize","goal","discipline","work","focus","achieve","responsible","careful","schedule","productive"]),
        "extraversion":      _keyword_score(combined, ["people","social","friends","talk","party","energy","outgoing","fun","laugh","together","group","meet"]),
        "agreeableness":     _keyword_score(combined, ["kind","help","care","support","empathy","gentle","trust","cooperate","warm","compassion","understand"]),
        "neuroticism":       _keyword_score(combined, ["worry","anxious","stress","nervous","fear","upset","mood","sensitive","overwhelm","panic","tense","unstable"]),
    }
    t_kw_ms = (time.perf_counter() - t_kw_start) * 1000
    logger.info("[PERF_AUDIT][%s] Stage: Keyword Scoring | Duration: %.2f ms", req_label, t_kw_ms)

    # If HF API available, try the Personality LM for better scores
    t_hf_ms = 0.0
    if HF_API_KEY and len(combined) > 200:
        t_hf_start = time.perf_counter()
        try:
            hf_scores = _hf_personality_scores(combined[:1000])
            if hf_scores:
                scores.update(hf_scores)
        except Exception as e:
            logger.warning("[PERF_AUDIT][%s] Stage: HF API | Status: Exception | ExceptionType: %s", req_label, type(e).__name__)
        t_hf_ms = (time.perf_counter() - t_hf_start) * 1000
        logger.info("[PERF_AUDIT][%s] Stage: HF API | Duration: %.2f ms", req_label, t_hf_ms)

    t_db_start = time.perf_counter()
    profile, _ = UserProfile.objects.get_or_create(user=user)
    profile.openness          = scores["openness"]
    profile.conscientiousness = scores["conscientiousness"]
    profile.extraversion      = scores["extraversion"]
    profile.agreeableness     = scores["agreeableness"]
    profile.neuroticism       = scores["neuroticism"]
    profile.save(update_fields=["openness","conscientiousness","extraversion","agreeableness","neuroticism"])
    t_db_ms = (time.perf_counter() - t_db_start) * 1000
    logger.info("[PERF_AUDIT][%s] Stage: UserProfile Update | Duration: %.2f ms", req_label, t_db_ms)

    t_prof_total_ms = (time.perf_counter() - t_prof_start) * 1000
    logger.info("[PERF_AUDIT][%s] Stage: Profile Update Total | Duration: %.2f ms", req_label, t_prof_total_ms)
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


# ── Crisis Keyword Detection & Supportive Helpline Resources ─────────────────
CRISIS_KEYWORDS = [
    "suicide", "suicidal", "kill myself", "end my life", "want to die",
    "self-harm", "self harm", "cutting myself", "hurt myself", "hopeless",
    "no reason to live", "can't go on", "cant go on", "overdose", "end it all",
    "die today", "ending it", "take my life"
]

CRISIS_HELPLINE_NOTE = (
    "💜 You are not alone. If you or someone you know is going through a difficult time or experiencing thoughts of self-harm, "
    "please reach out for immediate, free, and confidential support:\n"
    "• India: Kiran Mental Health Helpline 1800-599-0019 (24/7), iCall 9152987821, Vandrevala Foundation 1860-2662-345\n"
    "• Nepal: TPO Nepal Suicide Crisis Line 1166 (24/7 toll-free)"
)



def detect_crisis_keywords(text: str) -> tuple[bool, str]:
    """
    Scans text against crisis/self-harm keywords.
    Returns (has_crisis_match, supportive_helpline_note).
    Reused across AI Insights and Community Feed safety moderation.
    """
    if not text:
        return False, ""
    lower = text.lower()
    for kw in CRISIS_KEYWORDS:
        if re.search(r'\b' + re.escape(kw) + r'\b', lower):
            return True, CRISIS_HELPLINE_NOTE
    return False, ""

