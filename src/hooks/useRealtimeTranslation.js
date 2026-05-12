import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeClient } from '../utils/realtimeClient.js'

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
    apiKey, sourceCode, targetCode,
    deviceId, transcribeInput
  } = options

  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [history, setHistory] = useState([])
  const [activity, setActivity] = useState({ user: false, assistant: false })

  const clientRef         = useRef(null)
  const audioElRef        = useRef(null)
  const currentSourceRef  = useRef('')
  const currentTranslationRef = useRef('')
  const sourceCodeRef     = useRef(sourceCode)
  const targetCodeRef     = useRef(targetCode)

  useEffect(() => { sourceCodeRef.current = sourceCode }, [sourceCode])
  useEffect(() => { targetCodeRef.current = targetCode }, [targetCode])

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
        sourceCode: sourceCodeRef.current,
        targetCode: targetCodeRef.current,
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

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'session.input_transcript.delta':
        currentSourceRef.current += event.delta || ''
        setSourceTranscript(currentSourceRef.current)
        setActivity(a => ({ ...a, user: true }))
        break
      case 'session.input_transcript.done':
      case 'session.input_transcript.completed':
        if (event.transcript) {
          currentSourceRef.current = event.transcript
          setSourceTranscript(currentSourceRef.current)
        }
        setActivity(a => ({ ...a, user: false }))
        break
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
        // History commits on swap or disconnect, not here, so the panels
        // keep accumulating until the user takes a turn.
        break
      case 'error':
        setError(event.error?.message || 'Errore sconosciuto dalla Realtime API')
        break
      default:
        break
    }
  }, [])

  const connect = useCallback(async () => {
    if (!apiKey) {
      setError('Inserisci una chiave API OpenAI nelle impostazioni.')
      return
    }
    setError(null)
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
        targetLangCode: targetCode, transcribeInput
      }))
    } catch (err) {
      setError(err.message)
      setStatus('error')
      client.disconnect()
      clientRef.current = null
    }
  }, [apiKey, targetCode, deviceId, transcribeInput, handleEvent])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    commitToHistory()
    setStatus('disconnected')
    setActivity({ user: false, assistant: false })
  }, [commitToHistory])

  // Manual swap: only allowed while connected. Commits the current
  // transcript pair to history and pushes a session.update with the new
  // output language.
  const applyDirection = useCallback((newSource, newTarget) => {
    commitToHistory()
    sourceCodeRef.current = newSource
    targetCodeRef.current = newTarget
    if (clientRef.current) {
      clientRef.current.updateSession({
        audio: { output: { language: newTarget } }
      })
    }
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
        targetLangCode: targetCode,
        transcribeInput
      }))
    }
  }, [transcribeInput, targetCode, status])

  useEffect(() => () => {
    if (clientRef.current) clientRef.current.disconnect()
  }, [])

  return {
    status, error, isMuted,
    sourceTranscript, translation, history, activity,
    connect, disconnect, toggleMute, clearHistory, applyDirection
  }
}
