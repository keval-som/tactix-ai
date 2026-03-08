import json
from config import client, MODEL_PRO
from google.genai.types import GenerateContentConfig

def analyze_multimodal(context):

    prompt = f"""
    USER CONTEXT:
    {context.get("user_context", "")}

    TRANSCRIPT:
    {context["transcript"]}

    SENTIMENT:
    {context["sentiment"]}

    DATASET INFO:
    {context.get("dataset_info", "")}

    Detect:
    - tactic_detected
    - risk_level (Low/Medium/High)
    - recommended_response (max 15 words)

    Output JSON only.
    """

    response = client.models.generate_content(
        model=MODEL_PRO,
        contents=prompt,
        config=GenerateContentConfig(temperature=0.2)
    )

    return json.loads(response.text)