import os
from dotenv import load_dotenv

# Load .env from the current directory
env_path = os.path.join(os.getcwd(), ".env")
load_dotenv(env_path)

# Debug: print environment variables
print(f"LIVEKIT_URL: {os.getenv('LIVEKIT_URL')}")
print(f"LIVEKIT_API_KEY: {os.getenv('LIVEKIT_API_KEY')}")
print(f"GOOGLE_APPLICATION_CREDENTIALS: {os.getenv('GOOGLE_APPLICATION_CREDENTIALS')}")

# Set up Google Cloud authentication using service account
gcp_key_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if gcp_key_path:
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = gcp_key_path

from livekit.agents import AgentServer, cli, JobContext, AgentSession
from livekit.plugins import google
from config import MODEL_PRO  # use PRO model for better understanding
from agents.dealsight_agent import DealSightAgent

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        stt=google.STT(),
        llm=google.LLM(model=MODEL_PRO),
        tts=google.TTS(),
    )
    agent = DealSightAgent()
    await session.start(agent=agent, room=ctx.room)

if __name__ == "__main__":
    cli.run_app(server)