import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeClient, buildTranslationInstructions } from '../utils/realtimeClient.js'

export function useRealtimeTranslation(options) {
  const {
    apiKey, model, voice,
    sourceLang, targetLang,
    deviceId, translationMode,
    autoPlayAudio, transcribeInput
  } = options

  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [history, setHistory] = useState([])
  const [activity, setActivity] = useState({ user: false, assistant: false })

  const clientRef = useRef(null)
  const audioElRef = useRef(null)
  const currentSourceRef = useRef('')
  const currentTranslationRef = useRef('')

  useEffect(() => {
    const el = document.createElement('audio')
    el.autoplay = true
    el.playsInline = true
    el.style.display = 'none'
    document.body.appendChild(el)
    audioElRef.current = el
    return () => {
      el.srcObject = null
      el.remove()
    }
  }, [])

  useEffect(() => {
    if (audioElRef.current) audioElRef.current.muted = !autoPlayAudio
  }, [autoPlayAudio])

  const handleEvent = useCallback((event) => {
    switch (event.type) {
      case 'input_audio_buffer.speech_started':
        currentSourceRef.current = ''
        setSourceTranscript('')
        setActivity(a => ({ ...a, user: true }))
        break
      case 'input_audio_buffer.speech_stopped':
        setActivity(a => ({ ...a, user: false }))
        break
      case 'conversation.item.input_audio_transcription.delta':
        currentSourceRef.current += event.delta || ''
        setSourceTranscript(currentSourceRef.current)
        break
      case 'conversation.item.input_audio_transcription.completed':
        currentSourceRef.current = event.transcript || currentSourceRef.current
        setSourceTranscript(currentSourceRef.current)
        break
      case 'response.created':
        currentTranslationRef.current = ''
        setTranslation('')
        setActivity(a => ({ ...a, assistant: true }))
        break
      case 'response.audio_transcript.delta':
        currentTranslationRef.current += event.delta || ''
        setTranslation(currentTranslationRef.current)
        break
      case 'response.audio_transcript.done':
        currentTranslationRef.current = event.transcript || currentTranslationRef.current
        setTranslation(currentTranslationRef.current)
        break
      case 'response.done':
        setActivity(a => ({ ...a, assistant: false }))
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
        }
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
      model,
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
      client.updateSession({
        modalities: ['audio', 'text'],
        voice,
        instructions: buildTranslationInstructions({
          sourceLang, targetLang, mode: translationMode
        }),
        input_audio_transcription: transcribeInput ? { model: 'whisper-1' } : null,
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 600,
          create_response: true
        },
        temperature: 0.6
      })
    } catch (err) {
      setError(err.message)
      setStatus('error')
      client.disconnect()
      clientRef.current = null
    }
  }, [apiKey, model, voice, sourceLang, targetLang, deviceId, translationMode, transcribeInput, handleEvent])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
    }
    setStatus('disconnected')
    setActivity({ user: false, assistant: false })
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

  // Aggiorna istruzioni quando cambiano lingua / voce / modalità durante la sessione
  useEffect(() => {
    if (status === 'connected' && clientRef.current) {
      clientRef.current.updateSession({
        voice,
        instructions: buildTranslationInstructions({
          sourceLang, targetLang, mode: translationMode
        }),
        input_audio_transcription: transcribeInput ? { model: 'whisper-1' } : null
      })
    }
  }, [sourceLang, targetLang, translationMode, voice, transcribeInput, status])

  useEffect(() => () => {
    if (clientRef.current) clientRef.current.disconnect()
  }, [])

  return {
    status, error, isMuted,
    sourceTranscript, translation, history, activity,
    connect, disconnect, toggleMute, clearHistory
  }
}
