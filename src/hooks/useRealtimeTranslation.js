import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeClient } from '../utils/realtimeClient.js'

const MODEL = 'gpt-realtime-translate'
const TRANSCRIPTION_MODEL = 'gpt-realtime-whisper'

// session.update payload for the OpenAI realtime translation session.
// See https://developers.openai.com/api/docs/guides/realtime-translation
//
// The translation transcription block accepts ONLY { model }; passing a
// `language` hint there is rejected with "Unknown parameter". When the API
// rejects the session.update the WHOLE payload is dropped, including
// `audio.output.language`, and the model falls back to its default target
// (Spanish). So we keep the payload strictly minimal.
function buildSessionConfig({ targetLangCode, transcribeInput }) {
  const session = {
    audio: {
      output: { language: targetLangCode }
    }
  }
  if (transcribeInput) {
    session.audio.input = {
      transcription: { model: TRANSCRIPTION_MODEL }
    }
  }
  return session
}

export function useRealtimeTranslation(options) {
  const {
    apiKey,
    targetLangCode,
    deviceId, transcribeInput
  } = options

  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [history, setHistory] = useState([])
  const [activity, setActivity] = useState({ user: false, assistant: false })
  const [remoteStream, setRemoteStream] = useState(null)
  const [audioElement, setAudioElement] = useState(null)

  const clientRef = useRef(null)
  const audioElRef = useRef(null)
  const currentSourceRef = useRef('')
  const currentTranslationRef = useRef('')
  const speakingTimerRef = useRef(null)

  useEffect(() => {
    const el = document.createElement('audio')
    el.autoplay = true
    el.playsInline = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElRef.current = el
    setAudioElement(el)
    return () => {
      el.srcObject = null
      el.remove()
    }
  }, [])

  const commitToHistory = useCallback(() => {
    if (currentSourceRef.current || currentTranslationRef.current) {
      setHistory(h => [
        {
          id: (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
          source: currentSourceRef.current,
          translation: currentTranslationRef.current,
          ts: Date.now()
        },
        ...h
      ].slice(0, 50))
      currentSourceRef.current = ''
      currentTranslationRef.current = ''
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
        if (event.transcript) currentSourceRef.current = event.transcript
        setSourceTranscript(currentSourceRef.current)
        setActivity(a => ({ ...a, user: false }))
        break
      case 'session.output_transcript.delta':
        currentTranslationRef.current += event.delta || ''
        setTranslation(currentTranslationRef.current)
        setActivity(a => ({ ...a, assistant: true }))
        if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current)
        speakingTimerRef.current = setTimeout(() => {
          setActivity(a => ({ ...a, assistant: false }))
          commitToHistory()
          setSourceTranscript('')
          setTranslation('')
        }, 1800)
        break
      case 'session.output_transcript.done':
      case 'session.output_transcript.completed':
        if (event.transcript) currentTranslationRef.current = event.transcript
        setTranslation(currentTranslationRef.current)
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
        setRemoteStream(stream)
      },
      onError: (err) => setError(err.message)
    })
    clientRef.current = client

    try {
      await client.connect({ deviceId })
      client.updateSession(buildSessionConfig({
        targetLangCode, transcribeInput
      }))
    } catch (err) {
      setError(err.message)
      setStatus('error')
      client.disconnect()
      clientRef.current = null
      setRemoteStream(null)
    }
  }, [apiKey, targetLangCode, deviceId, transcribeInput, handleEvent])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    if (speakingTimerRef.current) {
      clearTimeout(speakingTimerRef.current)
      speakingTimerRef.current = null
    }
    setStatus('disconnected')
    setActivity({ user: false, assistant: false })
    setRemoteStream(null)
  }, [])

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev
      if (clientRef.current) clientRef.current.setMuted(next)
      return next
    })
  }, [])

  const clearHistory = useCallback(() => {
    setHistory([])
    setSourceTranscript('')
    setTranslation('')
  }, [])

  // Live re-config while the session is open (e.g. user swaps languages)
  useEffect(() => {
    if (status === 'connected' && clientRef.current) {
      clientRef.current.updateSession(buildSessionConfig({
        targetLangCode, transcribeInput
      }))
    }
  }, [targetLangCode, transcribeInput, status])

  useEffect(() => () => {
    if (clientRef.current) clientRef.current.disconnect()
    if (speakingTimerRef.current) clearTimeout(speakingTimerRef.current)
  }, [])

  return {
    status, error, isMuted,
    sourceTranscript, translation, history, activity,
    remoteStream, audioElement,
    connect, disconnect, toggleMute, clearHistory
  }
}
