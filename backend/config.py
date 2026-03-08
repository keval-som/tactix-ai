import vertexai
from google import genai

PROJECT_ID = "gcloud-hackathon-s522npwiwoyxz"
LOCATION = "us-central1"

MODEL_FAST = "gemini-2.5-flash"
MODEL_PRO = "gemini-2.5-flash"

vertexai.init(project=PROJECT_ID, location=LOCATION)

client = genai.Client(vertexai=True)