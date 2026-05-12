import { useEffect, useRef } from 'react'

// Read the live RMS amplitude of an <audio> element through a ref so we can
// drive a 60fps lip-sync animation without forcing React re-renders.
//
// Why we tap the AUDIO ELEMENT and not the WebRTC MediaStream directly:
// MediaStreamSource backed by a WebRTC track stops yielding samples as soon
// as the remote peer (OpenAI) finishes sending RTP packets, even though the
// browser is still playing back the buffered audio. createMediaElementSource
// reads the actual playback path of the <audio> element, so we get accurate
// amplitude for the ENTIRE duration the user hears the voice.
//
// createMediaElementSource can be called only ONCE per element — we cache
// the AudioContext / AnalyserNode on the element itself.
export function useAudioAmplitude(audioElement) {
  const amplitudeRef = useRef(0)

  useEffect(() => {
    amplitudeRef.current = 0
    if (!audioElement) return

    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return

    function ensureGraph() {
      if (audioElement.__rtCtx) return audioElement.__rtCtx
      try {
        const ctx = new AC()
        const source = ctx.createMediaElementSource(audioElement)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.45
        source.connect(analyser)
        analyser.connect(ctx.destination)
        audioElement.__rtCtx = ctx
        audioElement.__rtAnalyser = analyser
        audioElement.__rtData = new Uint8Array(analyser.frequencyBinCount)
        return ctx
      } catch (err) {
        console.warn('useAudioAmplitude: graph setup failed', err)
        return null
      }
    }

    const ctx = ensureGraph()
    if (!ctx) return

    const tryResume = () => {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    }
    tryResume()
    audioElement.addEventListener('play', tryResume)
    audioElement.addEventListener('playing', tryResume)

    let raf
    let stopped = false
    const tick = () => {
      if (stopped) return
      const analyser = audioElement.__rtAnalyser
      const data = audioElement.__rtData
      if (analyser && data) {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        amplitudeRef.current = Math.sqrt(sum / data.length)
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      audioElement.removeEventListener('play', tryResume)
      audioElement.removeEventListener('playing', tryResume)
      amplitudeRef.current = 0
      // We intentionally DO NOT close the AudioContext here: the graph is
      // bound to the audio element for its whole lifetime (createMediaElementSource
      // can be called only once). Closing would break future analyser starts.
    }
  }, [audioElement])

  return amplitudeRef
}
