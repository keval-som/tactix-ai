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
        # Enhanced system instructions for better semantic understanding
        system_instructions = """You are DealSight, an intelligent conversational AI assistant specializing in deal analysis and business intelligence. Your role is to:

1. UNDERSTAND THE USER'S INTENT: Carefully analyze what the user is actually asking for, not just the literal words.
2. PROVIDE CONTEXT-AWARE RESPONSES: Remember the conversation history and maintain coherence.
3. ANALYZE SENTIMENT & TONE: Detect emotional nuances, urgency, and underlying concerns in the user's speech.
4. USE AVAILABLE TOOLS: Leverage sentiment analysis and data retrieval to enrich your responses.
5. ASK CLARIFYING QUESTIONS: If the user's intent is ambiguous, ask for clarification rather than guessing.
6. EXPLAIN YOUR REASONING: Give clear, logical explanations for your suggestions and insights.

You have access to:
- Sentiment analysis for detecting emotional tone and pressure levels
- Data retrieval from a comprehensive dataset
- Multimodal reasoning for integrating multiple information sources
- Text summarization for condensing complex information

Always be conversational, empathetic, and helpful."""

        super().__init__(
            instructions=system_instructions,
            tools=[get_sentiment, summarize_text],
        )
        self.full_transcript = []
        self.user_context = ""
        self.conversation_history = []  # Track conversation for better context


    async def on_start(self, ctx: JobContext):
        self.user_context = ctx.metadata.get("context", "")

    async def on_text(self, text: str, ctx: JobContext):
        """Process user input with enhanced NLP understanding."""
        
        # Live transcript buffer
        self.full_transcript.append(text)
        self.conversation_history.append({"role": "user", "content": text})

        # Real-time sentiment analysis
        sentiment = analyze_sentiment(text)

        # Dataset retrieval with better semantic understanding
        # Combine user input with recent conversation context
        recent_context = " ".join([
            msg.get("content", "") 
            for msg in self.conversation_history[-3:]  # last 3 messages for context
        ])
        
        dataset_info = retrieve_from_dataset(
            text + " " + recent_context + " " + self.user_context
        )

        # Multimodal reasoning with enriched context
        result = analyze_multimodal({
            "transcript": text,
            "sentiment": sentiment,
            "dataset_info": dataset_info,
            "user_context": self.user_context,
            "conversation_history": self.conversation_history[-5:],  # last 5 turns
        })

        response = result.get("recommended_response", 
                             "I understand. Could you tell me more?")
        
        # Track agent response in conversation history
        self.conversation_history.append({"role": "assistant", "content": response})
        
        # Respond to user
        await ctx.say(response)

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