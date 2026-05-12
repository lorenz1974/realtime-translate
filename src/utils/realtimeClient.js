// OpenAI Realtime API — dedicated translation endpoint.
// Docs: https://developers.openai.com/api/docs/guides/realtime-translation
const TRANSLATIONS_ENDPOINT = 'https://api.openai.com/v1/realtime/translations/calls'

export class RealtimeClient {
  constructor({ apiKey, model, onEvent, onTrack, onStatus }) {
    this.apiKey = apiKey
    this.model = model
    this.onEvent = onEvent || (() => {})
    this.onTrack = onTrack || (() => {})
    this.onStatus = onStatus || (() => {})
    this.pc = null
    this.dc = null
    this.localStream = null
  }

  async connect({ deviceId } = {}) {
    this.onStatus('connecting')

    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...(deviceId ? { deviceId: { exact: deviceId } } : {})
    }
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })

    this.pc = new RTCPeerConnection()

    this.pc.ontrack = (e) => {
      if (e.streams && e.streams[0]) this.onTrack(e.streams[0])
    }

    this.pc.oniceconnectionstatechange = () => {
      const s = this.pc?.iceConnectionState
      if (s === 'failed' || s === 'disconnected' || s === 'closed') {
        this.onStatus('disconnected')
      }
    }

    this.localStream.getAudioTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream)
    })

    this.dc = this.pc.createDataChannel('oai-events')
    this.dc.onmessage = (e) => {
      try {
        this.onEvent(JSON.parse(e.data))
      } catch (err) {
        console.warn('Bad event from Realtime API', err, e.data)
      }
    }
    this.dc.onclose = () => this.onStatus('disconnected')

    const offer = await this.pc.createOffer()
    await this.pc.setLocalDescription(offer)

    const url = `${TRANSLATIONS_ENDPOINT}?model=${encodeURIComponent(this.model)}`
    const sdpResponse = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/sdp'
      },
      body: offer.sdp
    })

    if (!sdpResponse.ok) {
      const text = await sdpResponse.text()
      throw new Error(`Realtime API handshake failed (${sdpResponse.status}): ${text.slice(0, 240)}`)
    }

    const answerSdp = await sdpResponse.text()
    await this.pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

    await new Promise((resolve, reject) => {
      if (this.dc.readyState === 'open') return resolve()
      const onOpen = () => { cleanup(); resolve() }
      const onErr  = () => { cleanup(); reject(new Error('Data channel error')) }
      const cleanup = () => {
        this.dc.removeEventListener('open', onOpen)
        this.dc.removeEventListener('error', onErr)
      }
      this.dc.addEventListener('open', onOpen, { once: true })
      this.dc.addEventListener('error', onErr, { once: true })
      setTimeout(() => { cleanup(); reject(new Error('Timeout waiting for data channel')) }, 10000)
    })

    this.onStatus('connected')
  }

  sendEvent(event) {
    if (this.dc && this.dc.readyState === 'open') {
      this.dc.send(JSON.stringify(event))
    }
  }

  updateSession(session) {
    this.sendEvent({ type: 'session.update', session })
  }

  setMuted(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => { t.enabled = !muted })
    }
  }

  disconnect() {
    try { this.dc && this.dc.close() } catch {}
    try { this.pc && this.pc.close() } catch {}
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(t => t.stop())
    }
    this.pc = null
    this.dc = null
    this.localStream = null
    this.onStatus('disconnected')
  }
}
