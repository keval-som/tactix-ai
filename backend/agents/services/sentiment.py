import json
from config import client, MODEL_FAST
from google.genai.types import GenerateContentConfig

def analyze_sentiment(text):

    prompt = f"""
    Detect:
    - aggression_level (0-1)
    - urgency_pressure (0-1)
    - intimidation_presence (true/false)
    - deception_bluff (true/false)

    Text:
    {text}

    Output strict JSON.
    """

    response = client.models.generate_content(
        model=MODEL_FAST,
        contents=prompt,
        config=GenerateContentConfig(temperature=0.1)
    )

    try:
        return json.loads(response.text)
    except:
        return {}