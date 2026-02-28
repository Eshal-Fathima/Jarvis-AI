import asyncio
from dotenv import load_dotenv
load_dotenv()
from tools import get_weather, search_web
from livekit.agents.llm.tool_context import ToolContext

async def test():
    print("Testing weather...")
    w = await get_weather(None, "London")
    print("Weather result:", w)
    
    print("Testing search...")
    s = await search_web(None, "Height of Eiffel Tower")
    print("Search result:", s)

asyncio.run(test())
