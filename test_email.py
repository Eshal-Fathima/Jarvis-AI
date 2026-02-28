import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from tools import send_email

async def test():
    print("Testing send_email...")
    user = os.getenv("GMAIL_USER")
    print(f"GMAIL_USER: {user}")
    try:
        res = await send_email(None, "arthirajendran24@gmail.com", "Test from Agent", "This is a test email")
        print("Result:", res)
    except Exception as e:
        print("Exception:", e)

asyncio.run(test())
