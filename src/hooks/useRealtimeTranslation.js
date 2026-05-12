import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeClient } from '../utils/realtimeClient.js'
import { detectLanguage } from '../utils/languages.js'

const MODEL = 'gpt-realtime-translate'
const TRANSCRIPTION_MODEL = 'gpt-realtime-whisper'

function buildSessionConfig({ targetLangCode, transcribeInput }) {
  const session = { audio: { output: { language: targetLangCode } } }
  if (transcribeInput) {
    session.audio.input = { transcription: { model: TRANSCRIPTION_MODEL } }
  }
  return session
}

export function useRealtimeTranslation(options) {
  const {
    apiKey, langA, langB, conversationMode,
    deviceId, transcribeInput
  } = options

  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [history, setHistory] = useState([])
  const [activity, setActivity] = useState({ user: false, assistant: false })

  // In conversation mode the current direction can flip. We expose the
  // "who is speaking" code so the UI can show it as a badge.
  const [activeSourceCode, setActiveSourceCode] = useState(langA)
  const [activeTargetCode, setActiveTargetCode] = useState(langB)

  const clientRef         = useRef(null)
  const audioElRef        = useRef(null)
  const currentSourceRef  = useRef('')
  const currentTranslationRef = useRef('')
  const activeSourceRef   = useRef(langA)
  const activeTargetRef   = useRef(langB)
  const langARef          = useRef(langA)
  const langBRef          = useRef(langB)
  const conversationModeRef = useRef(conversationMode)

  useEffect(() => { langARef.current = langA }, [langA])
  useEffect(() => { langBRef.current = langB }, [langB])
  useEffect(() => { conversationModeRef.current = conversationMode }, [conversationMode])
  useEffect(() => { activeSourceRef.current = activeSourceCode }, [activeSourceCode])
  useEffect(() => { activeTargetRef.current = activeTargetCode }, [activeTargetCode])

  useEffect(() => {
    const el = document.createElement('audio')
    el.autoplay = true
    el.playsInline = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElRef.current = el
    return () => { el.srcObject = null; el.remove() }
  }, [])

  const commitToHistory = useCallback(() => {
    if (currentSourceRef.current || currentTranslationRef.current) {
      const entry = {
        id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
        sourceCode: activeSourceRef.current,
        targetCode: activeTargetRef.current,
        source: currentSourceRef.current,
        translation: currentTranslationRef.current,
        ts: Date.now()
      }
      setHistory(h => [entry, ...h].slice(0, 50))
      currentSourceRef.current = ''
      currentTranslationRef.current = ''
      setSourceTranscript('')
      setTranslation('')
    }
  }, [])

  // Swap direction: commit current transcript to history, flip active
  // source/target, and tell the model the new output language via
  // session.update.
  const swap = useCallback(() => {
    commitToHistory()
    const newSource = activeTargetRef.current
    const newTarget = activeSourceRef.current
    setActiveSourceCode(newSource)
    setActiveTargetCode(newTarget)
    if (clientRef.current) {
      clientRef.current.updateSession({
        audio: { output: { language: newTarget } }
      })
    }
  }, [commitToHistory])

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'session.input_transcript.delta':
        currentSourceRef.current += event.delta || ''
        setSourceTranscript(currentSourceRef.current)
        setActivity(a => ({ ...a, user: true }))
        break
      case 'session.input_transcript.done':
      case 'session.input_transcript.completed': {
        if (event.transcript) {
          currentSourceRef.current = event.transcript
          setSourceTranscript(currentSourceRef.current)
        }
        setActivity(a => ({ ...a, user: false }))
        // --- Auto-swap in conversation mode ---
        if (conversationModeRef.current && event.transcript) {
          const a = langARef.current
          const b = langBRef.current
          const detected = detectLanguage(event.transcript, [a, b])
          if (detected && detected !== activeSourceRef.current) {
            // Speaker switched. Use 50ms delay so the just-arrived transcript
            // gets committed to history under the OLD direction first.
            setTimeout(() => {
              commitToHistory()
              const newSource = detected
              const newTarget = detected === a ? b : a
              setActiveSourceCode(newSource)
              setActiveTargetCode(newTarget)
              if (clientRef.current) {
                clientRef.current.updateSession({
                  audio: { output: { language: newTarget } }
                })
              }
            }, 50)
          }
        }
        break
      }
      case 'session.output_transcript.delta':
        currentTranslationRef.current += event.delta || ''
        setTranslation(currentTranslationRef.current)
        setActivity(a => ({ ...a, assistant: true }))
        break
      case 'session.output_transcript.done':
      case 'session.output_transcript.completed':
        if (event.transcript) {
          currentTranslationRef.current = event.transcript
          setTranslation(currentTranslationRef.current)
        }
        setActivity(a => ({ ...a, assistant: false }))
        // NB: no commitToHistory here — we keep streaming until a swap.
        break
      case 'error':
        setError(event.error?.message || 'Errore sconosciuto dalla Realtime API')
        break
      default:
        break
    }
  }, [commitToHistory])

  const connect = useCallback(async () => {
    if (!apiKey) {
      setError('Inserisci una chiave API OpenAI nelle impostazioni.')
      return
    }
    setError(null)
    // Reset active direction to the user's chosen langA -> langB at every connect.
    setActiveSourceCode(langA)
    setActiveTargetCode(langB)
    activeSourceRef.current = langA
    activeTargetRef.current = langB

    const client = new RealtimeClient({
      apiKey,
      model: MODEL,
      onEvent: handleEvent,
      onStatus: setStatus,
      onTrack: (stream) => {
        if (audioElRef.current) {
          audioElRef.current.srcObject = stream
          audioElRef.current.play?.().catch(() => {})
        }
      },
      onError: (err) => setError(err.message)
    })
    clientRef.current = client

    try {
      await client.connect({ deviceId })
      client.updateSession(buildSessionConfig({
        targetLangCode: langB, transcribeInput
      }))
    } catch (err) {
      setError(err.message)
      setStatus('error')
      client.disconnect()
      clientRef.current = null
    }
  }, [apiKey, langA, langB, deviceId, transcribeInput, handleEvent])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    commitToHistory()
    setStatus('disconnected')
    setActivity({ user: false, assistant: false })
  }, [commitToHistory])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      if (clientRef.current) clientRef.current.setMuted(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
  }, [])

  // When the user toggles transcription on/off mid-session
  useEffect(() => {
    if (status === 'connected' && clientRef.current) {
      clientRef.current.updateSession(buildSessionConfig({
        targetLangCode: activeTargetRef.current,
        transcribeInput
      }))
    }
  }, [transcribeInput, status])

  useEffect(() => () => {
    if (clientRef.current) clientRef.current.disconnect()
  }, [])

  return {
    status, error, isMuted,
    sourceTranscript, translation, history, activity,
    activeSourceCode, activeTargetCode,
    connect, disconnect, toggleMute, clearHistory, swap
  }
}
