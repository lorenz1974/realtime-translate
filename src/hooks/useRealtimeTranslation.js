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

function similarity(a, b) {
  if (!a || !b) return 0
  const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').trim()
  const wa = norm(a).split(/\s+/).filter(Boolean)
  const wb = norm(b).split(/\s+/).filter(Boolean)
  if (wa.length === 0 || wb.length === 0) return 0
  const setB = new Set(wb)
  let hits = 0
  for (const w of wa) if (setB.has(w)) hits++
  return hits / Math.max(wa.length, wb.length)
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

  const [activeSourceCode, setActiveSourceCode] = useState(langA)
  const [activeTargetCode, setActiveTargetCode] = useState(langB)
  // In conversation mode, becomes true after the first successful detect.
  // While false the UI can show "Auto-detecting..." and the cooldown is
  // skipped so the very first swap is instant.
  const [directionLocked, setDirectionLocked] = useState(!conversationMode)

  const clientRef         = useRef(null)
  const audioElRef        = useRef(null)
  const currentSourceRef  = useRef('')
  const currentTranslationRef = useRef('')
  const activeSourceRef   = useRef(langA)
  const activeTargetRef   = useRef(langB)
  const langARef          = useRef(langA)
  const langBRef          = useRef(langB)
  const conversationModeRef = useRef(conversationMode)
  const directionLockedRef  = useRef(!conversationMode)
  const lastDetectAtRef     = useRef(0)
  const swapCooldownRef     = useRef(0)

  useEffect(() => { langARef.current = langA }, [langA])
  useEffect(() => { langBRef.current = langB }, [langB])
  useEffect(() => {
    conversationModeRef.current = conversationMode
    // Toggling the mode resets the lock so the next sentence does a fresh detect.
    if (conversationMode) {
      directionLockedRef.current = false
      setDirectionLocked(false)
    } else {
      directionLockedRef.current = true
      setDirectionLocked(true)
    }
  }, [conversationMode])
  useEffect(() => { activeSourceRef.current = activeSourceCode }, [activeSourceCode])
  useEffect(() => { activeTargetRef.current = activeTargetCode }, [activeTargetCode])
  useEffect(() => { directionLockedRef.current = directionLocked }, [directionLocked])

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

  const flipDirection = useCallback((newSource, newTarget, opts = {}) => {
    const skipCooldown = opts.skipCooldown || !directionLockedRef.current
    if (!skipCooldown && Date.now() < swapCooldownRef.current) return false
    swapCooldownRef.current = Date.now() + 1500
    // On the very first detect we don't want a fake history entry made of
    // a half-echo of the new speaker's first words — discard it instead.
    if (!directionLockedRef.current) {
      currentSourceRef.current = ''
      currentTranslationRef.current = ''
      setSourceTranscript('')
      setTranslation('')
    } else {
      commitToHistory()
    }
    setActiveSourceCode(newSource)
    setActiveTargetCode(newTarget)
    activeSourceRef.current = newSource
    activeTargetRef.current = newTarget
    lastDetectAtRef.current = 0
    setDirectionLocked(true)
    directionLockedRef.current = true
    if (clientRef.current) {
      clientRef.current.updateSession({
        audio: { output: { language: newTarget } }
      })
    }
    return true
  }, [commitToHistory])

  const swap = useCallback(() => {
    flipDirection(activeTargetRef.current, activeSourceRef.current, { skipCooldown: true })
  }, [flipDirection])

  const maybeAutoSwapByText = useCallback((text) => {
    if (!conversationModeRef.current) return
    if (!text) return
    const minLen = directionLockedRef.current ? 6 : 4
    if (text.length < minLen) return
    if (text.length - lastDetectAtRef.current < 3) return
    lastDetectAtRef.current = text.length
    const a = langARef.current
    const b = langBRef.current
    const detected = detectLanguage(text, [a, b])
    if (!detected) return
    if (directionLockedRef.current && detected === activeSourceRef.current) return
    const newTarget = detected === a ? b : a
    flipDirection(detected, newTarget)
  }, [flipDirection])

  const maybeAutoSwapByEcho = useCallback(() => {
    if (!conversationModeRef.current) return
    const src = currentSourceRef.current
    const tr  = currentTranslationRef.current
    if (!src || !tr) return
    if (src.length < 6 || tr.length < 6) return
    const sim = similarity(src, tr)
    if (sim >= 0.65) {
      flipDirection(activeTargetRef.current, activeSourceRef.current)
    }
  }, [flipDirection])

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'session.input_transcript.delta':
        currentSourceRef.current += event.delta || ''
        setSourceTranscript(currentSourceRef.current)
        setActivity(a => ({ ...a, user: true }))
        maybeAutoSwapByText(currentSourceRef.current)
        break
      case 'session.input_transcript.done':
      case 'session.input_transcript.completed': {
        if (event.transcript) {
          currentSourceRef.current = event.transcript
          setSourceTranscript(currentSourceRef.current)
        }
        setActivity(a => ({ ...a, user: false }))
        maybeAutoSwapByText(currentSourceRef.current)
        break
      }
      case 'session.output_transcript.delta':
        currentTranslationRef.current += event.delta || ''
        setTranslation(currentTranslationRef.current)
        setActivity(a => ({ ...a, assistant: true }))
        if (currentTranslationRef.current.length > 8 &&
            currentTranslationRef.current.length % 16 < 4) {
          maybeAutoSwapByEcho()
        }
        break
      case 'session.output_transcript.done':
      case 'session.output_transcript.completed':
        if (event.transcript) {
          currentTranslationRef.current = event.transcript
          setTranslation(currentTranslationRef.current)
        }
        setActivity(a => ({ ...a, assistant: false }))
        maybeAutoSwapByEcho()
        break
      case 'error':
        setError(event.error?.message || 'Errore sconosciuto dalla Realtime API')
        break
      default:
        break
    }
  }, [maybeAutoSwapByText, maybeAutoSwapByEcho])

  const connect = useCallback(async () => {
    if (!apiKey) {
      setError('Inserisci una chiave API OpenAI nelle impostazioni.')
      return
    }
    setError(null)
    setActiveSourceCode(langA)
    setActiveTargetCode(langB)
    activeSourceRef.current = langA
    activeTargetRef.current = langB
    lastDetectAtRef.current = 0
    swapCooldownRef.current = 0
    // In conversation mode the first incoming sentence determines the
    // direction. Until then, keep the lock OFF.
    const initialLocked = !conversationMode
    setDirectionLocked(initialLocked)
    directionLockedRef.current = initialLocked

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
  }, [apiKey, langA, langB, conversationMode, deviceId, transcribeInput, handleEvent])

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
    activeSourceCode, activeTargetCode, directionLocked,
    connect, disconnect, toggleMute, clearHistory, swap
  }
}
