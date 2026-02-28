import { useState, useEffect, useRef } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useParticipants,
  useTracks,
  useRoomContext,
  useIsSpeaking,
  useChat,
} from '@livekit/components-react'
import { Track, RoomEvent } from 'livekit-client'
import '@livekit/components-styles'

// ─── Scanning animation lines ────────────────────────────────────────────────
function ScanLines() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.03) 2px, rgba(0,200,255,0.03) 4px)',
    }} />
  )
}

// ─── Animated corner brackets ─────────────────────────────────────────────────
function CornerBrackets({ color = '#00c8ff', size = 24, thickness = 2 }) {
  const s = { position: 'absolute', width: size, height: size, borderColor: color, borderStyle: 'solid' }
  return (
    <>
      <div style={{ ...s, top: 0, left: 0, borderWidth: `${thickness}px 0 0 ${thickness}px` }} />
      <div style={{ ...s, top: 0, right: 0, borderWidth: `${thickness}px ${thickness}px 0 0` }} />
      <div style={{ ...s, bottom: 0, left: 0, borderWidth: `0 0 ${thickness}px ${thickness}px` }} />
      <div style={{ ...s, bottom: 0, right: 0, borderWidth: `0 ${thickness}px ${thickness}px 0` }} />
    </>
  )
}

// ─── Audio wave bars (shown when Jarvis is speaking) ─────────────────────────
function AudioWave({ active }) {
  const bars = 12
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 32 }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 3,
            borderRadius: 2,
            backgroundColor: '#00c8ff',
            height: active ? `${10 + Math.random() * 22}px` : '4px',
            transition: 'height 0.12s ease',
            animation: active ? `wave ${0.4 + (i % 4) * 0.1}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.05}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Local camera video feed ──────────────────────────────────────────────────
function LocalCamera() {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: false })
  const localTrack = tracks.find(t => t.participant?.isLocal)
  const videoRef = useRef(null)

  useEffect(() => {
    if (localTrack?.publication?.track && videoRef.current) {
      localTrack.publication.track.attach(videoRef.current)
      return () => localTrack.publication.track.detach(videoRef.current)
    }
  }, [localTrack])

  return (
    <div style={{
      position: 'relative', width: '100%', aspectRatio: '16/9',
      background: '#050c14', borderRadius: 8, overflow: 'hidden',
      border: '1px solid rgba(0,200,255,0.25)',
    }}>
      <ScanLines />
      <CornerBrackets />
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
      />
      <div style={{
        position: 'absolute', bottom: 8, left: 10, fontSize: 11,
        color: '#00c8ff', fontFamily: 'Rajdhani', letterSpacing: 2, opacity: 0.8,
      }}>
        LIVE FEED
      </div>
    </div>
  )
}

// ─── Jarvis speaking indicator UI (Pure Component) ─────────────────────────
function JarvisStatusUI({ connected, isSpeaking }) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (connected) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [connected])

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
      padding: '24px 32px',
      border: '1px solid rgba(0,200,255,0.2)',
      borderRadius: 12,
      background: 'rgba(0,200,255,0.04)',
      position: 'relative',
    }}>
      <CornerBrackets size={16} color='rgba(0,200,255,0.5)' />

      {/* Arc reactor ring */}
      <div style={{
        width: 96, height: 96, borderRadius: '50%', position: 'relative',
        border: `2px solid ${isSpeaking ? '#00c8ff' : connected ? 'rgba(0,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
        boxShadow: isSpeaking ? '0 0 24px #00c8ff88, inset 0 0 24px #00c8ff22' : 'none',
        transition: 'all 0.3s ease',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          border: `1px solid ${connected ? 'rgba(0,200,255,0.6)' : 'rgba(255,255,255,0.05)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: isSpeaking
              ? 'radial-gradient(circle, #00c8ff 0%, #0066aa 60%, transparent 100%)'
              : connected
                ? 'radial-gradient(circle, rgba(0,200,255,0.3) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
            transition: 'all 0.3s ease',
          }} />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 18, fontWeight: 700,
          color: connected ? '#00c8ff' : 'rgba(255,255,255,0.3)',
          letterSpacing: 4, marginBottom: 4,
        }}>
          JARVIS
        </div>
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 13, letterSpacing: 2,
          color: isSpeaking ? '#00c8ff' : connected ? 'rgba(0,200,255,0.5)' : 'rgba(255,255,255,0.2)',
        }}>
          {!connected ? `STANDBY${dots}` : isSpeaking ? 'SPEAKING' : 'LISTENING'}
        </div>
      </div>

      <AudioWave active={isSpeaking} />
    </div>
  )
}

// Wrapper that uses the hook safely
function JarvisStatusConnected({ participant }) {
  const isSpeaking = useIsSpeaking(participant)
  return <JarvisStatusUI connected={true} isSpeaking={isSpeaking} />
}

// ─── Container ──────────────────────────────────────────────────────────────
function JarvisStatus() {
  const participants = useParticipants()
  const agentParticipant = participants.find(p => !p.isLocal)

  if (!agentParticipant) {
    return <JarvisStatusUI connected={false} isSpeaking={false} />
  }

  return <JarvisStatusConnected participant={agentParticipant} />
}

// ─── Text Chat UI ──────────────────────────────────────────────────────────────
function TextChat() {
  const { send, chatMessages, isSending } = useChat()
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!input.trim() || isSending) return
    send(input)
    setInput('')
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 380, borderRadius: 12,
      background: 'rgba(0,200,255,0.03)',
      border: '1px solid rgba(0,200,255,0.15)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px', background: 'rgba(0,200,255,0.08)',
        borderBottom: '1px solid rgba(0,200,255,0.1)',
        fontFamily: 'Rajdhani', fontSize: 12, letterSpacing: 3,
        color: 'rgba(0,200,255,0.7)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <span>TEXT LINK</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#00c8ff' }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(0,200,255,0.3)' }} />
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: 16,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {chatMessages.map((msg, i) => {
          const isAgent = !msg.from?.isLocal
          return (
            <div key={msg.id || i} style={{
              alignSelf: isAgent ? 'flex-start' : 'flex-end',
              maxWidth: '85%',
            }}>
              <div style={{
                fontFamily: 'Rajdhani', fontSize: 10, letterSpacing: 1,
                color: isAgent ? 'rgba(0,200,255,0.5)' : 'rgba(255,255,255,0.3)',
                marginBottom: 4, textAlign: isAgent ? 'left' : 'right',
              }}>
                {isAgent ? 'JARVIS' : 'USER'}
              </div>
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: isAgent ? 'rgba(0,200,255,0.1)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isAgent ? 'rgba(0,200,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                borderBottomLeftRadius: isAgent ? 2 : 8,
                borderBottomRightRadius: isAgent ? 8 : 2,
                fontFamily: 'sans-serif', fontSize: 13, lineHeight: 1.5,
                color: isAgent ? '#e0f7ff' : '#ffffff',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.message}
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex', padding: 12, gap: 12,
        borderTop: '1px solid rgba(0,200,255,0.1)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type message to JARVIS..."
          style={{
            flex: 1, background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6, padding: '10px 14px',
            color: '#fff', outline: 'none',
            fontFamily: 'Rajdhani', fontSize: 14, letterSpacing: 1,
          }}
          onFocus={e => e.target.style.borderColor = 'rgba(0,200,255,0.4)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          style={{
            padding: '0 20px', borderRadius: 6,
            background: input.trim() ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${input.trim() ? 'rgba(0,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
            color: input.trim() ? '#00c8ff' : 'rgba(255,255,255,0.2)',
            fontFamily: 'Rajdhani', fontSize: 13, letterSpacing: 2,
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
          }}
        >
          SEND
        </button>
      </form>
    </div>
  )
}

// ─── Main room UI (shown after connecting) ────────────────────────────────────
function RoomUI({ onDisconnect }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 320px',
      gap: 24,
      width: '100%',
      maxWidth: 1100,
      alignItems: 'start',
    }}>
      {/* Left: Camera feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: 3,
          color: 'rgba(0,200,255,0.5)', marginBottom: -8,
        }}>
          VISUAL INPUT — CAM-01
        </div>
        <LocalCamera />
        <div style={{
          display: 'flex', gap: 16, justifyContent: 'flex-end',
        }}>
          <button
            onClick={onDisconnect}
            style={{
              padding: '8px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,80,80,0.5)',
              color: 'rgba(255,80,80,0.8)',
              borderRadius: 4,
              fontFamily: 'Rajdhani',
              fontSize: 13,
              letterSpacing: 2,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.target.style.background = 'rgba(255,80,80,0.1)'
              e.target.style.borderColor = 'rgba(255,80,80,0.9)'
            }}
            onMouseLeave={e => {
              e.target.style.background = 'transparent'
              e.target.style.borderColor = 'rgba(255,80,80,0.5)'
            }}
          >
            DISCONNECT
          </button>
        </div>
      </div>

      {/* Right: Jarvis status panel */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: 3,
          color: 'rgba(0,200,255,0.5)',
        }}>
          AGENT STATUS
        </div>
        <JarvisStatus />

        {/* Info panel */}
        <div style={{
          padding: '16px', borderRadius: 8,
          border: '1px solid rgba(0,200,255,0.1)',
          background: 'rgba(0,200,255,0.03)',
        }}>
          <div style={{ fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: 2, color: 'rgba(0,200,255,0.4)', marginBottom: 10 }}>
            SYSTEM
          </div>
          {[
            ['Voice', 'Aoede (Google)'],
            ['Model', 'Gemini Realtime'],
            ['Camera', 'Active'],
            ['Mode', 'Full Duplex'],
          ].map(([k, v]) => (
            <div key={k} style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: 'Rajdhani', fontSize: 13, marginBottom: 6,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.3)', letterSpacing: 1 }}>{k}</span>
              <span style={{ color: 'rgba(0,200,255,0.8)', letterSpacing: 1 }}>{v}</span>
            </div>
          ))}
        </div>

        <div style={{
          padding: '12px 16px', borderRadius: 8,
          background: 'rgba(0,200,255,0.05)',
          border: '1px solid rgba(0,200,255,0.1)',
          fontFamily: 'Rajdhani', fontSize: 12,
          color: 'rgba(255,255,255,0.35)', letterSpacing: 1, lineHeight: 1.6,
        }}>
          Speak naturally — Jarvis can hear you. Your camera feed is being sent to the agent.
        </div>

        <TextChat />
      </div>

      {/* LiveKit audio renderer (invisible — plays agent voice) */}
      <RoomAudioRenderer />
    </div>
  )
}

// ─── Connect screen ───────────────────────────────────────────────────────────
function ConnectScreen({ onConnect, connecting, error }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', gap: 32, minHeight: '60vh',
    }}>
      {/* Logo */}
      <div style={{ position: 'relative', width: 160, height: 160 }}>
        {[160, 130, 100].map((size, i) => (
          <div key={i} style={{
            position: 'absolute',
            top: (160 - size) / 2, left: (160 - size) / 2,
            width: size, height: size, borderRadius: '50%',
            border: `1px solid rgba(0,200,255,${0.15 + i * 0.1})`,
            animation: `pulse ${2 + i * 0.5}s ease-in-out infinite alternate`,
          }} />
        ))}
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,200,255,0.25) 0%, transparent 70%)',
            border: '2px solid rgba(0,200,255,0.6)',
            boxShadow: '0 0 40px rgba(0,200,255,0.3)',
          }} />
        </div>
      </div>

      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'Orbitron', fontSize: 40, fontWeight: 900,
          color: '#00c8ff', letterSpacing: 12,
          textShadow: '0 0 30px rgba(0,200,255,0.5)',
        }}>
          JARVIS
        </div>
        <div style={{
          fontFamily: 'Rajdhani', fontSize: 14, letterSpacing: 4,
          color: 'rgba(255,255,255,0.3)', marginTop: 6,
        }}>
          PERSONAL AI ASSISTANT
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 20px', borderRadius: 6,
          background: 'rgba(255,60,60,0.1)',
          border: '1px solid rgba(255,60,60,0.3)',
          fontFamily: 'Rajdhani', fontSize: 13, color: '#ff6060', letterSpacing: 1,
          maxWidth: 380, textAlign: 'center',
        }}>
          {error}
        </div>
      )}

      <button
        onClick={onConnect}
        disabled={connecting}
        style={{
          padding: '14px 48px',
          background: connecting ? 'rgba(0,200,255,0.1)' : 'transparent',
          border: '1px solid rgba(0,200,255,0.6)',
          color: '#00c8ff',
          borderRadius: 4,
          fontFamily: 'Orbitron', fontSize: 13, letterSpacing: 4,
          cursor: connecting ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          boxShadow: connecting ? 'none' : '0 0 20px rgba(0,200,255,0.15)',
        }}
        onMouseEnter={e => {
          if (!connecting) {
            e.target.style.background = 'rgba(0,200,255,0.12)'
            e.target.style.boxShadow = '0 0 32px rgba(0,200,255,0.35)'
          }
        }}
        onMouseLeave={e => {
          if (!connecting) {
            e.target.style.background = 'transparent'
            e.target.style.boxShadow = '0 0 20px rgba(0,200,255,0.15)'
          }
        }}
      >
        {connecting ? 'INITIALIZING...' : 'INITIATE'}
      </button>

      <div style={{
        fontFamily: 'Rajdhani', fontSize: 11, letterSpacing: 2,
        color: 'rgba(255,255,255,0.15)',
      }}>
        STARK INDUSTRIES · AI DIVISION
      </div>
    </div>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [roomToken, setRoomToken] = useState(null)
  const [serverUrl, setServerUrl] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const res = await fetch('http://localhost:8000/token')
      if (!res.ok) throw new Error(`Token server error: ${res.status}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setServerUrl(data.url)
      setRoomToken(data.token)
    } catch (err) {
      setError(`Could not connect: ${err.message}. Is token_server.py running?`)
      setConnecting(false)
    }
  }

  const handleDisconnect = () => {
    setRoomToken(null)
    setServerUrl(null)
    setConnecting(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#020a10',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 24px',
    }}>
      {/* Top bar */}
      <div style={{
        width: '100%', maxWidth: 1100, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 32, borderBottom: '1px solid rgba(0,200,255,0.1)',
        paddingBottom: 16,
      }}>
        <div style={{ fontFamily: 'Orbitron', fontSize: 14, color: 'rgba(0,200,255,0.6)', letterSpacing: 4 }}>
          J.A.R.V.I.S
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'Rajdhani', fontSize: 12, letterSpacing: 2,
          color: roomToken ? '#00ff88' : 'rgba(255,255,255,0.2)',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: roomToken ? '#00ff88' : 'rgba(255,255,255,0.15)',
            boxShadow: roomToken ? '0 0 8px #00ff88' : 'none',
          }} />
          {roomToken ? 'CONNECTED' : 'OFFLINE'}
        </div>
      </div>

      {!roomToken ? (
        <ConnectScreen onConnect={handleConnect} connecting={connecting} error={error} />
      ) : (
        <LiveKitRoom
          token={roomToken}
          serverUrl={serverUrl}
          connect={true}
          video={true}
          audio={true}
          onDisconnected={handleDisconnect}
          style={{ width: '100%', maxWidth: 1100 }}
        >
          <RoomUI onDisconnect={handleDisconnect} />
        </LiveKitRoom>
      )}

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #020a10; }
        @keyframes pulse {
          from { opacity: 0.4; transform: scale(0.97); }
          to   { opacity: 1;   transform: scale(1.03); }
        }
        @keyframes wave {
          from { transform: scaleY(0.5); }
          to   { transform: scaleY(1.5); }
        }
      `}</style>
    </div>
  )
}
