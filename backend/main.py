import os
from dotenv import load_dotenv

load_dotenv()

from livekit.agents import AgentServer, cli, JobContext, AgentSession
from livekit.plugins import google
from config import MODEL_FAST
from agents.dealsight_agent import DealSightAgent

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(
        stt=google.STT(),
        llm=google.LLM(model=MODEL_FAST, api_key=os.getenv("GOOGLE_API_KEY")),
        tts=google.TTS(),
    )
    agent = DealSightAgent()
    await session.start(agent=agent, room=ctx.room)

if __name__ == "__main__":
    cli.run_app(server)