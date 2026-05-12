import { useEffect, useRef } from 'react'

// Real-time viseme classifier driven by FFT bands of the playback audio.
// Returns a ref with { aa, ee, oo, energy } in [0..1] so a 60fps animation
// can blend mouth shapes without re-rendering React.
//
// Heuristics on frequency bands:
//   - low   (< 700 Hz)         -> rounded vowels  (O / U)
//   - mid   (700 - 2500 Hz)    -> open vowels     (A / AA)
//   - high  (2500 - 5000 Hz)   -> smile vowels    (E / I)
//
// We tap createMediaElementSource(audioElement) so amplitude stays alive
// for the entire playback (not only while OpenAI is still sending RTP).
export function useViseme(audioElement) {
  const visemeRef = useRef({ aa: 0, ee: 0, oo: 0, energy: 0 })

  useEffect(() => {
    visemeRef.current = { aa: 0, ee: 0, oo: 0, energy: 0 }
    if (!audioElement) return

    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return

    function ensureGraph() {
      if (audioElement.__rtCtx) return audioElement.__rtCtx
      try {
        const ctx = new AC()
        const source = ctx.createMediaElementSource(audioElement)
        const analyser = ctx.createAnalyser()
        analyser.fftSize = 2048
        analyser.smoothingTimeConstant = 0.4
        source.connect(analyser)
        analyser.connect(ctx.destination)
        audioElement.__rtCtx = ctx
        audioElement.__rtAnalyser = analyser
        audioElement.__rtFreq = new Uint8Array(analyser.frequencyBinCount)
        audioElement.__rtTime = new Uint8Array(analyser.frequencyBinCount)
        return ctx
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

    const sampleRate = ctx.sampleRate
    const binCount   = audioElement.__rtAnalyser.frequencyBinCount
    const binWidth   = sampleRate / 2 / binCount

    const lowMax  = Math.floor( 700 / binWidth)
    const midMax  = Math.floor(2500 / binWidth)
    const highMax = Math.floor(5000 / binWidth)

    let raf
    let stopped = false
    const SMOOTH = 0.45

    const tick = () => {
      if (stopped) return
      const analyser = audioElement.__rtAnalyser
      const freq = audioElement.__rtFreq
      const time = audioElement.__rtTime

      if (analyser && freq && time) {
        analyser.getByteFrequencyData(freq)
        analyser.getByteTimeDomainData(time)

        // RMS amplitude (0..~0.5 typical)
        let sumSq = 0
        for (let i = 0; i < time.length; i++) {
          const v = (time[i] - 128) / 128
          sumSq += v * v
        }
        const rms = Math.sqrt(sumSq / time.length)

        // Energy per band (average normalised)
        let lowSum = 0, midSum = 0, highSum = 0
        let lowCount = 0, midCount = 0, highCount = 0
        for (let i = 1; i < highMax; i++) {
          const v = freq[i] / 255
          if (i < lowMax)       { lowSum += v;  lowCount++ }
          else if (i < midMax)  { midSum += v;  midCount++ }
          else                  { highSum += v; highCount++ }
        }
        const low  = lowCount  ? lowSum  / lowCount  : 0
        const mid  = midCount  ? midSum  / midCount  : 0
        const high = highCount ? highSum / highCount : 0
        const total = low + mid + high || 1

        // Below this RMS we treat the audio as silence and decay weights
        // instead of producing garbage classifications on background noise.
        if (rms < 0.005) {
          const v = visemeRef.current
          v.aa *= 0.55
          v.ee *= 0.55
          v.oo *= 0.55
          v.energy *= 0.55
        } else {
          // Mid energy drives AA (open).
          // (low - high) drives OO (rounded, dark sound).
          // (high - low) drives EE/IH (bright sound).
          const aaRaw = mid / total
          const ooRaw = Math.max(low - high, 0) / total
          const eeRaw = Math.max(high - low, 0) / total

          const energy = Math.min(rms * 7, 1)

          // Normalise so the three weights sum to ~1 then scale by energy
          const wSum = aaRaw + eeRaw + ooRaw || 1
          const aaT = (aaRaw / wSum) * energy
          const eeT = (eeRaw / wSum) * energy
          const ooT = (ooRaw / wSum) * energy

          const v = visemeRef.current
          v.aa     += (aaT     - v.aa)     * SMOOTH
          v.ee     += (eeT     - v.ee)     * SMOOTH
          v.oo     += (ooT     - v.oo)     * SMOOTH
          v.energy += (energy  - v.energy) * SMOOTH
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
      // AudioContext intentionally kept open: createMediaElementSource is
      // one-shot per element, so we'd never be able to start again.
    }
  }, [audioElement])

  return visemeRef
}
