import { useEffect, useRef } from 'react'

// Read the live RMS amplitude of a MediaStream through a ref so we can
// drive a 60fps animation (mouth lip-sync) without forcing React re-renders.
export function useAudioAmplitude(stream) {
  const amplitudeRef = useRef(0)

  useEffect(() => {
    amplitudeRef.current = 0
    if (!stream) return

    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return

    let ctx, source, analyser, raf
    try {
      ctx = new AC()
      source = ctx.createMediaStreamSource(stream)
      analyser = ctx.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.55
      source.connect(analyser)

      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteTimeDomainData(data)
        let sum = 0
        for (let i = 0; i < data.length; i++) {
          const v = (data[i] - 128) / 128
          sum += v * v
        }
        amplitudeRef.current = Math.sqrt(sum / data.length)
        raf = requestAnimationFrame(tick)
      }
      tick()
    } catch (err) {
      console.warn('useAudioAmplitude: analyser setup failed', err)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      try { source && source.disconnect() } catch {}
      try { analyser && analyser.disconnect() } catch {}
      try { ctx && ctx.close() } catch {}
      amplitudeRef.current = 0
    }
  }, [stream])

  return amplitudeRef
}
