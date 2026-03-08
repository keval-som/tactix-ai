"""
Audio transcription + tactic analysis using Gemini multimodal audio input.
Receives a base64 audio blob from browser MediaRecorder (audio/webm or audio/ogg).
Returns structured segments (both speakers) + action cards in one Gemini call.
"""

import base64
import json
from config import client, MODEL_PRO
from google.genai.types import GenerateContentConfig, Part, Content


AUDIO_SYSTEM_PROMPT = """You are TactiX AI analyzing a short audio clip from a live negotiation call.

Tasks:
1. TRANSCRIBE into speaker turns. Two speakers: "adversary" (salesperson/agent/collector) and "you" (consumer).
   Use tone and language (aggressive, sales pressure) to identify the adversary.
   If unsure, label as "adversary".
2. DETECT negotiation tactics, illegal threats, junk fees, or psychological manipulation.

Return ONLY valid JSON:
{
  "segments": [
    { "speaker": "adversary" or "you", "text": "exact transcribed text", "highlights": ["dangerous phrase"] }
  ],
  "action_cards": [
    { "type": "LEGAL_SHIELD"|"MATH_CHECK"|"PSYCH_CUE"|"VISION_GOTCHA", "title": "max 8 words", "description": "max 50 words", "savings": <int or null> }
  ]
}

- highlights: only dangerous/manipulative/legally questionable words or phrases
- action_cards: only if something genuinely notable detected — empty array is fine
- If silent/unintelligible: {"segments": [], "action_cards": []}
Return ONLY JSON, no other text."""


def transcribe_and_analyze_audio(
    audio_b64: str,
    mime_type: str,
    scenario: str,
    user_context: str,
    transcript_history: list,
) -> dict:
    try:
        audio_bytes = base64.b64decode(audio_b64)
        clean_mime = mime_type.split(";")[0].strip()
        if not clean_mime.startswith("audio/"):
            clean_mime = "audio/webm"

        history_text = "\n".join(
            f"{e['speaker'].upper()}: {e['text']}" for e in transcript_history
        ) if transcript_history else "No prior context."

        context_prompt = (
            f"SCENARIO: {scenario}\n"
            f"CONSUMER CONTEXT: {user_context}\n"
            f"RECENT CONVERSATION:\n{history_text}\n\n"
            f"Transcribe and analyze the following audio clip:"
        )

        response = client.models.generate_content(
            model=MODEL_PRO,
            contents=Content(parts=[
                Part.from_text(text=context_prompt),
                Part.from_bytes(data=audio_bytes, mime_type=clean_mime),
            ]),
            config=GenerateContentConfig(
                temperature=0.1,
                system_instruction=AUDIO_SYSTEM_PROMPT,
            ),
        )

        raw = response.text.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:-1]) if len(lines) > 2 else "{}"

        result = json.loads(raw)
        result.setdefault("segments", [])
        result.setdefault("action_cards", [])
        return result

    except Exception as e:
        print(f"[audio_gemini] error: {e}")
        return {"segments": [], "action_cards": []}
