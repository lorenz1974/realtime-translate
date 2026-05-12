import { useCallback, useEffect, useRef, useState } from 'react'
import { RealtimeClient, buildTranslationInstructions } from '../utils/realtimeClient.js'
import { getVadPreset } from '../utils/languages.js'

function buildTurnDetection(presetId) {
  const p = getVadPreset(presetId)
  return {
    type: 'server_vad',
    threshold: p.threshold,
    prefix_padding_ms: p.prefix_padding_ms,
    silence_duration_ms: p.silence_duration_ms,
    create_response: true
  }
}

export function useRealtimeTranslation(options) {
  const {
    apiKey, model, transcriptionModel, voice,
    sourceLang, targetLang,
    deviceId, translationMode, vadPreset,
    autoPlayAudio, transcribeInput
  } = options

  const [status, setStatus] = useState('disconnected')
  const [error, setError] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [sourceTranscript, setSourceTranscript] = useState('')
  const [translation, setTranslation] = useState('')
  const [history, setHistory] = useState([])
  const [activity, setActivity] = useState({ user: false, assistant: false })
  const [remoteStream, setRemoteStream] = useState(null)

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
      case 'response.output_audio_transcript.delta':
      case 'response.audio_transcript.delta':
        currentTranslationRef.current += event.delta || ''
        setTranslation(currentTranslationRef.current)
        break
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        currentTranslationRef.current = event.transcript || currentTranslationRef.current
        setTranslation(currentTranslationRef.current)
        break
      case 'response.output_text.delta':
      case 'response.text.delta':
        if (!currentTranslationRef.current.length) {
          currentTranslationRef.current += event.delta || ''
          setTranslation(currentTranslationRef.current)
        }
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
        setRemoteStream(stream)
      },
      onError: (err) => setError(err.message)
    })
    clientRef.current = client

    try {
      await client.connect({ deviceId })
      client.updateSession({
        output_modalities: ['audio'],
        audio: {
          input: {
            transcription: transcribeInput
              ? { model: transcriptionModel || 'gpt-realtime-whisper' }
              : null,
            turn_detection: buildTurnDetection(vadPreset)
          },
          output: { voice }
        },
        instructions: buildTranslationInstructions({
          sourceLang, targetLang, mode: translationMode
        })
      })
    } catch (err) {
      setError(err.message)
      setStatus('error')
      client.disconnect()
      clientRef.current = null
      setRemoteStream(null)
    }
  }, [apiKey, model, transcriptionModel, voice, sourceLang, targetLang, deviceId, translationMode, vadPreset, transcribeInput, handleEvent])

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
      clientRef.current = null
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

  // Aggiorna istruzioni / voce / trascrizione / VAD durante la sessione attiva
  useEffect(() => {
    if (status === 'connected' && clientRef.current) {
      clientRef.current.updateSession({
        audio: {
          input: {
            transcription: transcribeInput
              ? { model: transcriptionModel || 'gpt-realtime-whisper' }
              : null,
            turn_detection: buildTurnDetection(vadPreset)
          },
          output: { voice }
        },
        instructions: buildTranslationInstructions({
          sourceLang, targetLang, mode: translationMode
        })
      })
    }
  }, [sourceLang, targetLang, translationMode, voice, transcriptionModel, transcribeInput, vadPreset, status])

  useEffect(() => () => {
    if (clientRef.current) clientRef.current.disconnect()
  }, [])

  return {
    status, error, isMuted,
    sourceTranscript, translation, history, activity,
    remoteStream,
    connect, disconnect, toggleMute, clearHistory
  }
}
