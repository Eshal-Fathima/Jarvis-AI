from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from livekit import api as lkapi
import os
from dotenv import load_dotenv
import uvicorn

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


import time

@app.get("/token")
async def get_token(identity: str = "user"):
    room = f"jarvis-room-{int(time.time())}"
    api_key = os.getenv("LIVEKIT_API_KEY")
    api_secret = os.getenv("LIVEKIT_API_SECRET")
    livekit_url = os.getenv("LIVEKIT_URL")

    if not api_key or not api_secret or not livekit_url:
        return {"error": "Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL in .env"}

    token = (
        lkapi.AccessToken(api_key, api_secret)
        .with_identity(identity)
        .with_name("User")
        .with_grants(lkapi.VideoGrants(room_join=True, room=room))
    )

    return {
        "token": token.to_jwt(),
        "url": livekit_url,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
