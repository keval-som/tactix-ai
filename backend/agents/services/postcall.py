"""
Post-call report generation using Gemini.
"""

import json
from config import client, MODEL_PRO
from google.genai.types import GenerateContentConfig


POSTCALL_PROMPT = """You are TactiX AI generating a post-negotiation debrief report.

Generate a JSON object with exactly this structure:
{
  "stats": {
    "savings": <total estimated dollar savings as integer>,
    "traps_deflected": <count of psychological/deception tactics detected as integer>,
    "outcome_sentiment": <one of "Strong Position", "Good Position", "Neutral", "Weak Position">
  },
  "follow_up_email": "<professional follow-up email to the adversary locking in concessions, referencing specific transcript facts. Use [Your Name] for the consumer.>"
}

Base savings on MATH_CHECK, LEGAL_SHIELD, VISION_GOTCHA cards with savings amounts.
Base traps_deflected on PSYCH_CUE + VISION_GOTCHA card count.
Return ONLY the JSON object, no other text."""


def generate_post_call_report(full_transcript: str, action_cards: list) -> dict:
    if not full_transcript.strip():
        return _empty_report()

    prompt = f"TRANSCRIPT:\n{full_transcript}\n\nACTION CARDS TRIGGERED:\n{json.dumps(action_cards, indent=2)}\n\nGenerate the debrief report."

    try:
        response = client.models.generate_content(
            model=MODEL_PRO,
            contents=prompt,
            config=GenerateContentConfig(
                temperature=0.3,
                system_instruction=POSTCALL_PROMPT,
            ),
        )
        raw = response.text.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if len(lines) > 2 else "{}"
        return json.loads(raw)
    except Exception as e:
        print(f"[postcall] error: {e}")
        return _fallback_report(action_cards)


def _empty_report() -> dict:
    return {
        "stats": {"savings": 0, "traps_deflected": 0, "outcome_sentiment": "Neutral"},
        "follow_up_email": "No transcript available to generate a follow-up email.",
    }


def _fallback_report(action_cards: list) -> dict:
    savings = sum(c.get("savings") or 0 for c in action_cards)
    traps = sum(1 for c in action_cards if c.get("type") in ("PSYCH_CUE", "VISION_GOTCHA"))
    return {
        "stats": {
            "savings": savings,
            "traps_deflected": traps,
            "outcome_sentiment": "Good Position" if savings > 0 else "Neutral",
        },
        "follow_up_email": (
            "Subject: Follow-up on Our Discussion\n\n"
            "Dear [Sales Representative],\n\n"
            "Thank you for your time today. I'd like to confirm in writing the terms we discussed. "
            "Please reply with a written summary of all fees, the final price, and the financing APR "
            "so we can proceed.\n\nBest regards,\n[Your Name]"
        ),
    }
