from livekit.agents import Agent, JobContext
from .services.sentiment import analyze_sentiment
from .services.retrieval import retrieve_from_dataset
from .services.orchestrator import analyze_multimodal

class DealSightAgent(Agent):

    def __init__(self):
        super().__init__(instructions="You are a DealSight agent that analyzes conversations for sentiment, retrieves relevant data from a dataset, and orchestrates multimodal reasoning to provide insights.")
        self.full_transcript = []
        self.user_context = ""

    async def on_start(self, ctx: JobContext):
        self.user_context = ctx.metadata.get("context", "")

    async def on_text(self, text: str, ctx: JobContext):

        # Live transcript buffer
        self.full_transcript.append(text)

        # Real-time sentiment
        sentiment = analyze_sentiment(text)

        # Dataset retrieval
        dataset_info = retrieve_from_dataset(
            text + " " + self.user_context
        )

        # Multimodal reasoning
        result = analyze_multimodal({
            "transcript": text,
            "sentiment": sentiment,
            "dataset_info": dataset_info,
            "user_context": self.user_context
        })

        whisper = result.get("recommended_response", 
                             "Pause before responding.")

        # Whisper back
        await ctx.say(whisper)

    async def on_shutdown(self, ctx: JobContext):

        full_text = "\n".join(self.full_transcript)

        report = generate_post_call_report(full_text)

        print("\n====== POST CALL REPORT ======\n")
        print(report)