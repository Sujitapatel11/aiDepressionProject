import json
import logging
import os
import time
import requests
from django.conf import settings
from apps.support.models import UserProfile, SupportConnection

logger = logging.getLogger(__name__)

HF_API_KEY = getattr(settings, "HF_API_KEY", os.environ.get("HF_API_KEY", ""))
HF_GEN_MODEL = getattr(settings, "HF_MODEL", os.environ.get("HF_MODEL", "mistralai/Mistral-7B-Instruct-v0.2"))
HF_LLM_TIMEOUT = 10

# Safe pre-written fallback question bank (strictly positive traits, zero free-text, zero negative options)
FALLBACK_QUESTION_BANK = [
    {
        "id": "q1",
        "prompt": "Which of these positive traits best describes your companion in chat?",
        "options": [
            "🌟 Thoughtful & Mindful",
            "😄 Great Sense of Humor",
            "🛡️ Wonderfully Supportive",
            "🎨 Creative & Inspiring",
        ],
        "category": "mindfulness",
    },
    {
        "id": "q2",
        "prompt": "What strength do you appreciate most in how they communicate?",
        "options": [
            "👂 Patient Listener",
            "💬 Expressive & Open",
            "🧘 Calm & Grounding",
            "💡 Encouraging & Positive",
        ],
        "category": "communication",
    },
    {
        "id": "q3",
        "prompt": "What kind of vibe do they bring to your conversations?",
        "options": [
            "☀️ Warm & Uplifting",
            "🌊 Peaceful & Relaxing",
            "🔮 Insightful & Deep",
            "⚡ Energetic & Fun",
        ],
        "category": "vibe",
    },
]


def generate_activity_questions(connection: SupportConnection) -> list:
    """
    Generates a personalized set of 3 positive-only guessing questions for a connection pair.
    First attempts HuggingFace LLM inference using derived tags & chat themes (no verbatim private text).
    Falls back to pre-written safe positive question bank on failure or missing API key.
    """
    user_one = connection.user_one
    user_two = connection.user_two

    from apps.support.views import _derive_interest_tags

    try:
        cp1 = UserProfile.objects.filter(user=user_one).first()
        cp2 = UserProfile.objects.filter(user=user_two).first()
    except Exception:
        cp1, cp2 = None, None

    tags1 = _derive_interest_tags(cp1)
    tags2 = _derive_interest_tags(cp2)

    # Extract recent message themes without exposing private verbatim text
    recent_msgs = connection.messages.order_by("-created_at")[:15]
    theme_words = set()
    for m in recent_msgs:
        words = [w.lower().strip() for w in m.content.split() if len(w) > 4]
        theme_words.update(words[:3])

    derived_themes = list(theme_words)[:5] or ["mindful", "supportive", "friendly"]

    if HF_API_KEY:
        try:
            llm_questions = _call_hf_llm_for_quiz(tags1 + tags2, derived_themes)
            if llm_questions and len(llm_questions) == 3:
                logger.info("Successfully generated personalized quiz via HuggingFace LLM")
                return llm_questions
        except Exception as e:
            logger.warning("HuggingFace LLM quiz generation failed (%s). Using safe fallback bank.", e)

    # Safe fallback
    return FALLBACK_QUESTION_BANK


def _call_hf_llm_for_quiz(tags: list, themes: list) -> list | None:
    """
    Calls HF Inference API to generate 3 strictly positive-only questions with 4 pre-written choices each.
    """
    url = f"https://api-inference.huggingface.co/models/{HF_GEN_MODEL}"
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json",
    }

    system_prompt = (
        "You are SoulCare Activity Generator. Generate a fun, positive-only 'Get to know each other' activity quiz.\n"
        "STRICT SAFETY RULES:\n"
        "1. ALL questions and options MUST be strictly positive, warm, and uplifting.\n"
        "2. NEVER include negative, critical, or insulting traits.\n"
        "3. NEVER use free-text inputs. Provide exactly 4 positive pre-written option strings per question.\n"
        "4. Return strictly a JSON array of 3 question objects matching this exact schema:\n"
        "[\n"
        '  {"id": "q1", "prompt": "Question text...", "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"]},\n'
        '  {"id": "q2", "prompt": "Question text...", "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"]},\n'
        '  {"id": "q3", "prompt": "Question text...", "options": ["Choice 1", "Choice 2", "Choice 3", "Choice 4"]}\n'
        "]"
    )

    context = f"Companion interest tags: {', '.join(tags)}. Conversation themes: {', '.join(themes)}."
    prompt = f"<|im_start|>system\n{system_prompt}<|im_end|>\n<|im_start|>user\n{context}<|im_end|>\n<|im_start|>assistant\n["

    payload = {
        "inputs": prompt,
        "parameters": {
            "max_new_tokens": 300,
            "temperature": 0.5,
            "return_full_text": False,
        },
    }

    resp = requests.post(url, headers=headers, json=payload, timeout=HF_LLM_TIMEOUT)
    if resp.status_code == 503:
        time.sleep(3)
        resp = requests.post(url, headers=headers, json=payload, timeout=HF_LLM_TIMEOUT)

    if resp.status_code == 200:
        data = resp.json()
        generated_text = ""
        if isinstance(data, list) and len(data) > 0:
            generated_text = data[0].get("generated_text", "")
        elif isinstance(data, dict):
            generated_text = data.get("generated_text", "")

        if generated_text and not generated_text.strip().startswith("["):
            generated_text = "[" + generated_text

        # Extract JSON array
        start = generated_text.find("[")
        end = generated_text.rfind("]")
        if start != -1 and end != -1:
            json_str = generated_text[start : end + 1]
            parsed = json.loads(json_str)
            if isinstance(parsed, list) and len(parsed) >= 3:
                # Sanity check: ensure each item has id, prompt, and 4 options
                cleaned = []
                for idx, q in enumerate(parsed[:3]):
                    if isinstance(q, dict) and "prompt" in q and "options" in q and len(q["options"]) >= 3:
                        cleaned.append({
                            "id": f"q{idx+1}",
                            "prompt": str(q["prompt"]),
                            "options": [str(opt) for opt in q["options"][:4]],
                        })
                if len(cleaned) == 3:
                    return cleaned

    return None
