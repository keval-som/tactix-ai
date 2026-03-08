import os
from google import genai

MODEL_FAST = "gemini-2.5-flash-preview-04-17"
MODEL_PRO  = "gemini-2.5-flash-preview-04-17"

# ── Auth strategy ─────────────────────────────────────────────────────────────
# Teammate's .env sets GOOGLE_GENAI_USE_VERTEXAI=true, which is picked up
# automatically by the google-genai SDK when constructing the client.
# For local dev without GCP ADC, fall back to GOOGLE_API_KEY.
_use_vertex = os.environ.get("GOOGLE_GENAI_USE_VERTEXAI", "").lower() == "true"
_api_key    = os.environ.get("GOOGLE_API_KEY")

if _use_vertex:
    # SDK reads GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION automatically
    client = genai.Client(vertexai=True)
elif _api_key:
    client = genai.Client(api_key=_api_key)
else:
    raise RuntimeError(
        "No credentials found. Set GOOGLE_GENAI_USE_VERTEXAI=true (with GCP ADC) "
        "or GOOGLE_API_KEY in your .env file."
    )