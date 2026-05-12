import { useEffect, useRef } from 'react'

// Read the live RMS amplitude of a MediaStream through a ref so we can
// drive a 60fps animation (mouth lip-sync) without forcing React re-renders.
//
// Important WebRTC gotcha: on Chrome/Safari an AnalyserNode connected to a
// MediaStreamSource produced by a WebRTC track stays silent (always zeros)
// unless the graph reaches `ctx.destination`. We add a mute GainNode so the
// analyser receives samples without doubling the audio output.
export function useAudioAmplitude(stream) {
  const amplitudeRef = useRef(0)

  useEffect(() => {
    amplitudeRef.current = 0
    if (!stream) return

    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return

    let ctx, source, analyser, muteGain, raf
    let stopped = false

    async function start() {
      try {
        ctx = new AC()
        if (ctx.state === 'suspended') {
          try { await ctx.resume() } catch {}
        }
        source = ctx.createMediaStreamSource(stream)
        analyser = ctx.createAnalyser()
        analyser.fftSize = 1024
        analyser.smoothingTimeConstant = 0.45

        muteGain = ctx.createGain()
        muteGain.gain.value = 0

        source.connect(analyser)
        analyser.connect(muteGain)
        muteGain.connect(ctx.destination)

        const data = new Uint8Array(analyser.frequencyBinCount)
        const tick = () => {
          if (stopped) return
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
    }
    start()

    return () => {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      try { source && source.disconnect() } catch {}
      try { analyser && analyser.disconnect() } catch {}
      try { muteGain && muteGain.disconnect() } catch {}
      try { ctx && ctx.close() } catch {}
      amplitudeRef.current = 0
    }
  }, [stream])

  return amplitudeRef
}
