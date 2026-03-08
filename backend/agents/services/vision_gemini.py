"""
Vision analysis using Gemini multimodal — facial expressions + document scanning.
"""

import base64
import json
from config import client, MODEL_FAST
from google.genai.types import GenerateContentConfig, Part, Content


def _image_part(image_b64: str) -> Part:
    return Part.from_bytes(data=base64.b64decode(image_b64), mime_type="image/jpeg")


def _parse_cards(raw: str) -> list:
    text = raw.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1]) if len(lines) > 2 else ""
    try:
        result = json.loads(text)
        return result if isinstance(result, list) else []
    except Exception:
        return []


FACIAL_PROMPT = """You are a behavioral analyst inside a real-time negotiation assistant.
Analyze the facial expressions and body language visible in this screenshot of a video call.

Focus on: stress indicators (tight jaw, furrowed brow, eye avoidance), deception cues
(micro-expressions, lip compression), confidence level, and power dynamic.

Return a JSON ARRAY of action cards. Only include cards when something notable is detected.
Each card:
{ "type": "PSYCH_CUE", "title": "short title (max 6 words)", "description": "actionable insight (max 40 words)", "savings": null }

If nothing significant: return []
Return ONLY the JSON array."""


DOCUMENT_PROMPT = """You are a consumer protection expert inside a real-time negotiation assistant.
Analyze this video call screenshot for any visible documents, contracts, PDFs, or spreadsheets.

If a document is visible, check for: hidden fees, non-refundable clauses, price discrepancies,
binding arbitration clauses, auto-renewal traps, or consumer-disadvantaging language.

Return a JSON ARRAY of action cards. Only generate cards for genuine red flags.
Each card:
{ "type": "VISION_GOTCHA", "title": "short title (max 6 words)", "description": "what was found and how to use it (max 50 words)", "savings": <integer or null> }

If no document visible or no red flags: return []
Return ONLY the JSON array."""


def analyze_facial_expression(image_b64: str) -> list:
    try:
        response = client.models.generate_content(
            model=MODEL_FAST,
            contents=Content(parts=[Part.from_text(text=FACIAL_PROMPT), _image_part(image_b64)]),
            config=GenerateContentConfig(temperature=0.2),
        )
        return _parse_cards(response.text)
    except Exception as e:
        print(f"[vision_gemini] facial error: {e}")
        return []


def analyze_document_frame(image_b64: str) -> list:
    try:
        response = client.models.generate_content(
            model=MODEL_FAST,
            contents=Content(parts=[Part.from_text(text=DOCUMENT_PROMPT), _image_part(image_b64)]),
            config=GenerateContentConfig(temperature=0.1),
        )
        return _parse_cards(response.text)
    except Exception as e:
        print(f"[vision_gemini] document error: {e}")
        return []
