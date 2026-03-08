from livekit.agents import Agent, JobContext, function_tool, RunContext
from .services.sentiment import analyze_sentiment
from .services.retrieval import retrieve_from_dataset
from .services.orchestrator import analyze_multimodal
from .services import vision
from .services.postcall import generate_post_call_report


@function_tool
def get_sentiment(context: RunContext, text: str):
    """Tool allowing the LLM to request sentiment analysis on arbitrary text."""
    return analyze_sentiment(text)

@function_tool
def summarize_text(context: RunContext, text: str):
    """A simple summarization tool.

    This is a placeholder; swap in a call to a proper summarization model or
    service if you need higher quality.
    """
    # very crude summary
    return {"summary": text[:200] + ("..." if len(text) > 200 else "")}

class DealSightAgent(Agent):

    def __init__(self):
        # register any tools we want the LLM to be able to call explicitly
        super().__init__(
            instructions="You are a DealSight agent that analyzes conversations for sentiment, retrieves relevant data from a dataset, and orchestrates multimodal reasoning to provide insights.",
            tools=[get_sentiment, summarize_text],
        )
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

    async def on_image(self, image_data: bytes, ctx: JobContext):
        """Handle an incoming image frame or screenshot.

        The `image_data` parameter depends on how the client sends vision data.
        For example, it might be a base64-encoded JPEG string or raw bytes.
        """
        # store or log the image if needed
        analysis = vision.analyze_image(image_data)

        # optionally update user context with vision info
        self.user_context += " \nIMAGE_INFO: " + str(analysis)

        # let the agent respond to the vision data
        await ctx.say("I saw the image and noted: {}".format(analysis.get("description", "")))

    async def on_shutdown(self, ctx: JobContext):

        full_text = "\n".join(self.full_transcript)

        report = generate_post_call_report(full_text)

        print("\n====== POST CALL REPORT ======\n")
        print(report)