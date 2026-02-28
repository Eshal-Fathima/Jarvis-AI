from dotenv import load_dotenv

from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    noise_cancellation,
)
from livekit.plugins import google
import logging
from prompts import AGENT_INSTRUCTION, SESSION_INSTRUCTION
from tools import get_weather, search_web, send_email
load_dotenv(override=True)

logging.basicConfig(level=logging.DEBUG)
logging.getLogger("livekit").setLevel(logging.DEBUG)

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=AGENT_INSTRUCTION,
            llm=google.beta.realtime.RealtimeModel(
            voice="Aoede",
            temperature=0.8,
        ),
            tools=[
                get_weather,
                search_web,
                send_email
            ],

        )
        


async def entrypoint(ctx: agents.JobContext):
    session = AgentSession(
        
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # - If self-hosting, omit this parameter
            # - For telephony applications, use `BVCTelephony` for best results
            video_enabled=True,
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    print("Connecting to room...")
    await ctx.connect()
    
    print("Agent connected. Generating initial greeting...")

    await session.generate_reply(
        instructions=SESSION_INSTRUCTION,
    )
    
    print("Greeting generated. Waiting for user input...")
    # Keep the task alive and wait for session to end so it continues listening
    ctx.add_shutdown_callback(lambda *args: print("Shutting down..."))


if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))