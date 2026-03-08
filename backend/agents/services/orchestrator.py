import json
from config import client, MODEL_PRO
from google.genai.types import GenerateContentConfig

def analyze_multimodal(context):
    """Enhanced multimodal reasoning with conversation context."""
    
    # Build conversation summary for context
    conv_history = context.get("conversation_history", [])
    conv_summary = "\n".join([
        f"{msg['role'].upper()}: {msg['content'][:100]}" 
        for msg in conv_history
    ]) if conv_history else "No prior context"

    prompt = f"""
    You are analyzing a business call conversation for risk assessment and tactical detection.
    
    CONVERSATION HISTORY:
    {conv_summary}
    
    CURRENT USER INPUT:
    {context["transcript"]}
    
    SENTIMENT ANALYSIS:
    {context.get("sentiment", {})}
    
    RELEVANT DATA:
    {context.get("dataset_info", "No relevant data")}
    
    USER CONTEXT:
    {context.get("user_context", "General inquiry")}
    
    Based on the above, provide your analysis:
    1. What is the user's primary intent?
    2. What tactics or pressures are being used (if any)?
    3. Risk level assessment: Low/Medium/High
    4. Recommended response (conversational, helpful, professional)
    5. Key points to address
    
    Output ONLY valid JSON in this format:
    {{
        "intent": "user's intent",
        "tactic_detected": "none/urgency/pressure/other",
        "risk_level": "Low/Medium/High",
        "key_points": ["point1", "point2"],
        "recommended_response": "your comprehensive response here (2-3 sentences)"
    }}
    """

    response = client.models.generate_content(
        model=MODEL_PRO,
        contents=prompt,
        config=GenerateContentConfig(temperature=0.3)
    )

    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        # Fallback if JSON parsing fails
        return {
            "intent": "unknown",
            "tactic_detected": "none",
            "risk_level": "Low",
            "key_points": [],
            "recommended_response": "Thank you for that input. Could you tell me more?"
        }
