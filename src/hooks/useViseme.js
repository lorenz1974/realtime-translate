import { useEffect, useRef } from 'react'

// Real-time viseme classifier driven by FFT bands of the playback audio.
// Returns a ref with { aa, ee, oo, energy } in [0..1] so a 60fps animation
// can blend mouth shapes without re-rendering React.
export function useViseme(audioElement) {
  const visemeRef = useRef({ aa: 0, ee: 0, oo: 0, energy: 0 })

  useEffect(() => {
    visemeRef.current = { aa: 0, ee: 0, oo: 0, energy: 0 }
    if (!audioElement) return

    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return

    // Build (or reuse) the audio graph on the element. createMediaElementSource
    // can only be called once per element, so we cache ctx/source/analyser on it.
    // IMPORTANT: we also ALWAYS (re)create the freq/time buffers even if the
    // ctx was cached by a previous hook, otherwise the tick has nothing to read.
    function ensureGraph() {
      try {
        if (!audioElement.__rtCtx) {
          const ctx = new AC()
          const source = ctx.createMediaElementSource(audioElement)
          const analyser = ctx.createAnalyser()
          analyser.fftSize = 2048
          analyser.smoothingTimeConstant = 0.4
          source.connect(analyser)
          analyser.connect(ctx.destination)
          audioElement.__rtCtx = ctx
          audioElement.__rtAnalyser = analyser
        }
        const analyser = audioElement.__rtAnalyser
        const binCount = analyser.frequencyBinCount
        if (!audioElement.__rtFreq || audioElement.__rtFreq.length !== binCount) {
          audioElement.__rtFreq = new Uint8Array(binCount)
        }
        if (!audioElement.__rtTime || audioElement.__rtTime.length !== binCount) {
          audioElement.__rtTime = new Uint8Array(binCount)
        }
        return audioElement.__rtCtx
      } catch (err) {
        console.warn('useViseme: graph setup failed', err)
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

    const analyser = audioElement.__rtAnalyser
    const sampleRate = ctx.sampleRate
    const binCount   = analyser.frequencyBinCount
    const binWidth   = sampleRate / 2 / binCount
    const lowMax    = Math.max(1, Math.floor( 700 / binWidth))
    const midMax    = Math.max(lowMax + 1, Math.floor(2500 / binWidth))
    const highMax   = Math.max(midMax + 1, Math.floor(5000 / binWidth))

    let raf
    let stopped = false
    const SMOOTH = 0.45

    const tick = () => {
      if (stopped) return
      const a = audioElement.__rtAnalyser
      const freq = audioElement.__rtFreq
      const time = audioElement.__rtTime

      if (a && freq && time) {
        a.getByteFrequencyData(freq)
        a.getByteTimeDomainData(time)

        // RMS amplitude
        let sumSq = 0
        for (let i = 0; i < time.length; i++) {
          const v = (time[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.sqrt(sumSq / time.length)

        let lowSum = 0, midSum = 0, highSum = 0
        let lowCount = 0, midCount = 0, highCount = 0
        for (let i = 1; i < highMax; i++) {
          const v = freq[i] / 255
          if (i < lowMax)       { lowSum  += v; lowCount++ }
          else if (i < midMax)  { midSum  += v; midCount++ }
          else                  { highSum += v; highCount++ }
        }
        const low  = lowCount  ? lowSum  / lowCount  : 0
        const mid  = midCount  ? midSum  / midCount  : 0
        const high = highCount ? highSum / highCount : 0
        const total = low + mid + high || 1

        if (rms < 0.003) {
          // Silence: decay weights toward zero (mouth closes smoothly)
          const v = visemeRef.current
          v.aa *= 0.6
          v.ee *= 0.6
          v.oo *= 0.6
          v.energy *= 0.6
        } else {
          const aaRaw = mid / total
          const ooRaw = Math.max(low - high, 0) / total
          const eeRaw = Math.max(high - low, 0) / total
          const wSum = aaRaw + eeRaw + ooRaw || 1
          const energy = Math.min(rms * 8, 1)

          const aaT = (aaRaw / wSum) * energy
          const eeT = (eeRaw / wSum) * energy
          const ooT = (ooRaw / wSum) * energy

          const v = visemeRef.current
          v.aa     += (aaT    - v.aa)     * SMOOTH
          v.ee     += (eeT    - v.ee)     * SMOOTH
          v.oo     += (ooT    - v.oo)     * SMOOTH
          v.energy += (energy - v.energy) * SMOOTH
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      stopped = true
      if (raf) cancelAnimationFrame(raf)
      audioElement.removeEventListener('play', tryResume)
      audioElement.removeEventListener('playing', tryResume)
      visemeRef.current = { aa: 0, ee: 0, oo: 0, energy: 0 }
      // AudioContext stays alive: createMediaElementSource is one-shot.
    }
  }, [audioElement])

  return visemeRef
}
