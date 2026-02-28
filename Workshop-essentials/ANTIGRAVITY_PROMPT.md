# Jarvis — Master Prompt for Antigravity

---

Build a full-stack real-time AI voice and vision assistant called **Jarvis**, inspired by the AI from Iron Man. The project has two parts: a Python backend (a LiveKit voice agent + a FastAPI token server) and a React + Vite frontend with a dark Stark Industries-themed UI.

---

## FILE STRUCTURE

```
jarvis/
├── agent.py
├── prompts.py
├── tools.py
├── token_server.py
├── requirements.txt
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── index.css
        └── App.jsx
```

---

## PYTHON BACKEND

### `requirements.txt`
```
livekit-agents
livekit-plugins-openai
livekit-plugins-silero
livekit-plugins-google
livekit-plugins-noise-cancellation
livekit-api
mem0ai
duckduckgo-search
langchain_community
requests
python-dotenv
fastapi
uvicorn
```

---

### `prompts.py`
Define two string constants:

`AGENT_INSTRUCTION` — tells the agent it is a personal assistant called Jarvis, similar to the AI from Iron Man. It speaks like a classy, sarcastic butler. It only ever answers in one sentence. When asked to do something it acknowledges with short phrases like "Will do, ma'am", "Roger Boss", or "Check!" and then in one short sentence describes what it did. Example: User says "Hi can you do XYZ for me?" → Jarvis replies "Of course ma'am, as you wish. I will now do the task XYZ for you."

`SESSION_INSTRUCTION` — tells the agent to begin the conversation by saying: "Hi my name is Jarvis, your personal assistant, how may I help you?"

---

### `tools.py`
Three async tool functions decorated with `@function_tool()` from `livekit.agents`. Each takes a `context: RunContext` as the first argument (ignored).

**`get_weather(context, city: str) -> str`**
Gets current weather for a city. First calls the Open-Meteo geocoding API (`https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=en&format=json`) to get lat/lon. Then calls the Open-Meteo forecast API (`https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true`) to get temperature (°C) and windspeed (km/h). Returns a sentence like "The current weather in {city} is {temp}°C with {windspeed} km/h wind." Handles errors gracefully.

**`search_web(context, query: str) -> str`**
Searches the web using LangChain's `DuckDuckGoSearchRun` tool. Calls `.run(tool_input=query)` and returns the results string. Handles errors gracefully.

**`send_email(context, to_email: str, subject: str, message: str, cc_email: Optional[str] = None) -> str`**
Sends an email via Gmail SMTP (smtp.gmail.com, port 587, TLS). Reads `GMAIL_USER` and `GMAIL_APP_PASSWORD` from environment variables. Builds a `MIMEMultipart` message, attaches the body as plain text, adds CC if provided, connects via `smtplib.SMTP`, calls `starttls()`, logs in, sends, and returns a success message. Handles `SMTPAuthenticationError` and general errors separately.

---

### `agent.py`
Uses the `livekit-agents` framework. Import `load_dotenv` and call it at the top. Set up `logging.basicConfig(level=logging.DEBUG)`.

Define a class `Assistant(Agent)` that calls `super().__init__()` with:
- `instructions=AGENT_INSTRUCTION` (from prompts.py)
- `llm=google.beta.realtime.RealtimeModel(voice="Aoede", temperature=0.8)` (from `livekit.plugins.google`)
- `tools=[get_weather, search_web, send_email]`

Define an async `entrypoint(ctx: agents.JobContext)` function that:
1. Creates an `AgentSession()`
2. Calls `session.start()` with `room=ctx.room`, `agent=Assistant()`, and `room_input_options=RoomInputOptions(video_enabled=True, noise_cancellation=noise_cancellation.BVC())`
3. Calls `await ctx.connect()`
4. Calls `await session.generate_reply(instructions=SESSION_INSTRUCTION)`
5. Registers a shutdown callback with `ctx.add_shutdown_callback`

Entry point: `agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))`

Run the agent with: `python agent.py dev`

---

### `token_server.py`
A FastAPI app running on port 8000. Add CORS middleware allowing all origins, methods, and headers. Load `.env` with `python-dotenv`.

One endpoint: `GET /token?identity=user`
- Generates a unique room name: `jarvis-room-{int(time.time())}`
- Reads `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_URL` from environment variables
- If any are missing, return `{"error": "Missing LIVEKIT_API_KEY, LIVEKIT_API_SECRET, or LIVEKIT_URL in .env"}`
- Creates a token using `livekit.api.AccessToken(api_key, api_secret).with_identity(identity).with_name("User").with_grants(lkapi.VideoGrants(room_join=True, room=room))`
- Returns `{"token": token.to_jwt(), "url": livekit_url}`

Run with: `python token_server.py`

---

## REACT FRONTEND

### `frontend/package.json`
React 18 + Vite 5 project. Dependencies: `@livekit/components-react ^2.6.0`, `@livekit/components-styles ^1.1.0`, `livekit-client ^2.5.0`, `react ^18.3.0`, `react-dom ^18.3.0`. Dev dependencies: `@vitejs/plugin-react ^4.3.0`, `vite ^5.4.0`.

### `frontend/vite.config.js`
Standard Vite + React plugin config. Dev server on port 3000.

### `frontend/index.html`
Standard HTML shell. Title: "Jarvis — Personal AI Assistant". Load Google Fonts: `Orbitron` (weights 400, 700, 900) and `Rajdhani` (weights 300, 400, 600).

### `frontend/src/index.css`
Reset margins/padding, set `background: #020a10` and `color: white` on html/body/#root. Smooth font rendering.

---

### `frontend/src/App.jsx`

**Design system:**
- Background: `#020a10` (deep navy black)
- Accent: `#00c8ff` (cyan)
- Success: `#00ff88` (green, for connected status)
- Danger: `rgba(255,80,80,...)` (red, for disconnect button)
- Font for titles/labels: `Orbitron`
- Font for body/UI text: `Rajdhani`
- All borders use `rgba(0,200,255, low-opacity)` for a subtle cyan glow effect
- No external UI library — all styles are inline

**Reusable components:**

`ScanLines` — An absolutely positioned overlay div with `repeating-linear-gradient` creating subtle horizontal scan lines (rgba cyan at 3% opacity every 4px). Pointer events none. Used over the camera feed.

`CornerBrackets({ color, size, thickness })` — Four absolutely positioned divs that form corner bracket decorations (like targeting reticles). Each div shows only two sides of a border using `borderWidth` tricks. Default color `#00c8ff`, size 24, thickness 2. Used on panels and the camera feed.

`AudioWave({ active })` — A row of 12 thin vertical bars (3px wide, rounded, cyan). When `active=true`, each bar animates with a `wave` keyframe (scaleY 0.5 → 1.5) at staggered timing using different durations based on `i % 4`. When inactive, bars are 4px tall with no animation.

`LocalCamera` — Uses `useTracks([Track.Source.Camera], { onlySubscribed: false })` to find the local participant's camera track. Uses a `useRef` and `useEffect` to call `track.attach(videoRef.current)` and detach on cleanup. Renders a 16:9 div with dark background, cyan border, `ScanLines` overlay, `CornerBrackets`, and a mirrored (`scaleX(-1)`) video element filling the container. Shows "LIVE FEED" label in the bottom-left corner.

`JarvisStatusUI({ connected, isSpeaking })` — Pure presentational component. Shows an arc reactor-style concentric ring indicator (outer ring 96px, middle ring 72px, inner circle 44px). When `isSpeaking`, the outer ring glows bright cyan with box-shadow, and the inner circle has a bright radial gradient. When `connected` but not speaking, rings glow softly. When not connected, rings are nearly invisible. Shows "JARVIS" in Orbitron and a status string: `STANDBY...` (animated dots using setInterval when not connected), `LISTENING`, or `SPEAKING`. Below that, shows the `AudioWave` component. Has `CornerBrackets` decorations with small size.

`JarvisStatusConnected({ participant })` — Calls `useIsSpeaking(participant)` hook and passes result to `JarvisStatusUI`. This wrapper exists to safely use the hook only when a participant exists.

`JarvisStatus` — Gets all participants with `useParticipants()`, finds the agent (the non-local participant). If no agent yet, renders `<JarvisStatusUI connected={false} isSpeaking={false} />`. If agent exists, renders `<JarvisStatusConnected participant={agentParticipant} />`.

`TextChat` — Uses `useChat()` hook to get `{ send, chatMessages, isSending }`. Has a local `input` state and a `messagesEndRef` that auto-scrolls on new messages. Renders a panel with a "TEXT LINK" header and two cyan dots. Chat messages scroll vertically — agent messages (`!msg.from?.isLocal`) are left-aligned with cyan-tinted bubbles labeled "JARVIS", user messages are right-aligned with white bubbles labeled "USER". At the bottom, a text input and "SEND" button. The input glows cyan on focus. The send button is cyan when there is input, muted when empty. Panel height is 380px.

`RoomUI({ onDisconnect })` — A 2-column CSS grid (`1fr 320px`, gap 24px, max-width 1100px). Left column: label "VISUAL INPUT — CAM-01", then `<LocalCamera />`, then a row with the "DISCONNECT" button (right-aligned, red border, brightens on hover). Right column: label "AGENT STATUS", then `<JarvisStatus />`, then a system info panel showing four key-value pairs (Voice: Aoede (Google), Model: Gemini Realtime, Camera: Active, Mode: Full Duplex), then a small tip text, then `<TextChat />`. Includes `<RoomAudioRenderer />` (invisible, plays the agent's audio back to the user).

`ConnectScreen({ onConnect, connecting, error })` — Centered vertically in `60vh`. Shows three pulsing concentric rings (sizes 160/130/100px) with a glowing central circle — the arc reactor logo. An animated `pulse` keyframe makes each ring gently breathe with different durations. "JARVIS" in large Orbitron font (size 40, weight 900, cyan, letter-spacing 12, with text-shadow glow). Subtitle "PERSONAL AI ASSISTANT" in Rajdhani. An error message box (red tint) shown only if `error` is set. The "INITIATE" button has a cyan border that glows stronger on hover; shows "INITIALIZING..." while connecting. Footer: "STARK INDUSTRIES · AI DIVISION" in very faint text.

`App` (default export) — Root component. State: `roomToken`, `serverUrl`, `connecting`, `error`. `handleConnect` fetches `http://localhost:8000/token`, sets token and url on success, sets error string on failure. `handleDisconnect` clears token and url. Renders a top navigation bar (max-width 1100px) with "J.A.R.V.I.S" on the left and a connection status dot+label on the right (green glowing dot + "CONNECTED" when token exists, grey + "OFFLINE" otherwise). Below that, renders `<ConnectScreen />` if no token, or `<LiveKitRoom token serverUrl connect={true} video={true} audio={true} onDisconnected={handleDisconnect}>` wrapping `<RoomUI />` if connected. Includes a `<style>` tag with global resets and the `pulse` and `wave` keyframe animations.

---

## ENVIRONMENT VARIABLES (`.env` file — not generated, user provides)

```
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
```

---

## HOW TO RUN

Terminal 1 — Start the LiveKit agent:
```
python agent.py dev
```

Terminal 2 — Start the token server:
```
python token_server.py
```

Terminal 3 — Start the frontend:
```
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`, click **INITIATE**, grant camera and microphone permissions, and start talking to Jarvis.
