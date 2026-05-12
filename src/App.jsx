import { useEffect, useMemo, useState } from 'react'
import { LANGUAGES, getLanguage } from './utils/languages.js'
import { useRealtimeTranslation } from './hooks/useRealtimeTranslation.js'
import Header from './components/Header.jsx'
import LanguageSelector from './components/LanguageSelector.jsx'
import MicButton from './components/MicButton.jsx'
import TranscriptPanel from './components/TranscriptPanel.jsx'
import SettingsPanel from './components/SettingsPanel.jsx'
import StatusBadge from './components/StatusBadge.jsx'
import HistoryList from './components/HistoryList.jsx'

const MODEL = 'gpt-realtime-translate'

export default function App() {
  const [apiKey, setApiKey]           = useState(() => localStorage.getItem('rt_api_key') || '')
  const [langA, setLangA]             = useState(() => localStorage.getItem('rt_lang_a') || 'it')
  const [langB, setLangB]             = useState(() => localStorage.getItem('rt_lang_b') || 'en')
  const [conversationMode, setConversationMode] = useState(() => localStorage.getItem('rt_conv') === '1')
  const [deviceId, setDeviceId]       = useState(() => localStorage.getItem('rt_device') || '')
  const [devices, setDevices]         = useState([])
  const [showSettings, setShowSettings] = useState(false)

  const [autoPlayAudio, setAutoPlayAudio]   = useState(() => localStorage.getItem('rt_autoplay') !== '0')
  const [transcribeInput, setTranscribeInput] = useState(() => localStorage.getItem('rt_transcribe') !== '0')
  const [showHistory, setShowHistory]         = useState(() => localStorage.getItem('rt_history') !== '0')

  const {
    status, error, isMuted,
    sourceTranscript, translation, history, activity,
    activeSourceCode, activeTargetCode, directionLocked,
    connect, disconnect, toggleMute, clearHistory, swap
  } = useRealtimeTranslation({
    apiKey,
    langA, langB, conversationMode,
    deviceId, transcribeInput
  })

  const activeSourceLanguage = useMemo(() => getLanguage(activeSourceCode), [activeSourceCode])
  const activeTargetLanguage = useMemo(() => getLanguage(activeTargetCode), [activeTargetCode])
  const langALanguage = useMemo(() => getLanguage(langA), [langA])
  const langBLanguage = useMemo(() => getLanguage(langB), [langB])
  const showAutoDetect = conversationMode && !directionLocked

  useEffect(() => { localStorage.setItem('rt_api_key', apiKey) },       [apiKey])
  useEffect(() => { localStorage.setItem('rt_lang_a', langA) },         [langA])
  useEffect(() => { localStorage.setItem('rt_lang_b', langB) },         [langB])
  useEffect(() => { localStorage.setItem('rt_conv', conversationMode ? '1' : '0') }, [conversationMode])
  useEffect(() => { localStorage.setItem('rt_device', deviceId) },      [deviceId])
  useEffect(() => { localStorage.setItem('rt_autoplay', autoPlayAudio ? '1' : '0') }, [autoPlayAudio])
  useEffect(() => { localStorage.setItem('rt_transcribe', transcribeInput ? '1' : '0') }, [transcribeInput])
  useEffect(() => { localStorage.setItem('rt_history', showHistory ? '1' : '0') }, [showHistory])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        if (!localStorage.getItem('rt_perm_ok')) {
          try {
            const s = await navigator.mediaDevices.getUserMedia({ audio: true })
            s.getTracks().forEach(t => t.stop())
            localStorage.setItem('rt_perm_ok', '1')
          } catch {}
        }
        const list = await navigator.mediaDevices.enumerateDevices()
        if (cancelled) return
        setDevices(list.filter(d => d.kind === 'audioinput'))
      } catch (err) {
        console.warn('enumerateDevices failed', err)
      }
    }
    load()
    navigator.mediaDevices?.addEventListener?.('devicechange', load)
    return () => {
      cancelled = true
      navigator.mediaDevices?.removeEventListener?.('devicechange', load)
    }
  }, [])

  const isConnected = status === 'connected'
  const isConnecting = status === 'connecting'

  return (
    <div className="app-shell">
      <div className="bg-blobs" aria-hidden="true">
        <span className="blob blob-1" />
        <span className="blob blob-2" />
        <span className="blob blob-3" />
      </div>

      <Header onOpenSettings={() => setShowSettings(true)} status={status} />

      <main className="container py-3 py-md-4">
        <section className="hero text-center mb-4">
          <h1 className="display-6 fw-bold mb-2">
            <span className="gradient-text">Traduzione</span> in tempo reale
          </h1>
          <p className="text-secondary mb-0">
            {conversationMode
              ? 'Modalità conversazione: parla in una delle due lingue, il sistema rileva chi parla e traduce nell’altra.'
              : 'Parla nel microfono e ascolta la traduzione mentre parli.'}
            <br className="d-none d-md-inline" />
            Motore <code>{MODEL}</code>.
          </p>
        </section>

        <div className="card glass-card border-0 shadow-lg mb-4">
          <div className="card-body p-3 p-md-4">
            <LanguageSelector
              source={langA}
              target={langB}
              onSourceChange={setLangA}
              onTargetChange={setLangB}
              onSwap={() => {
                if (isConnected) {
                  swap()
                } else {
                  setLangA(langB)
                  setLangB(langA)
                }
              }}
              labelA={conversationMode ? 'Lingua A' : 'Da'}
              labelB={conversationMode ? 'Lingua B' : 'A'}
            />

            <div className="conv-toggle mt-3">
              <div className="form-check form-switch m-0">
                <input className="form-check-input" type="checkbox" id="opt-conv"
                  checked={conversationMode} onChange={e => setConversationMode(e.target.checked)} />
                <label className="form-check-label fw-semibold" htmlFor="opt-conv">
                  <i className="bi bi-people-fill me-1 text-primary"></i>
                  Modalità conversazione (auto-detect lingua)
                </label>
              </div>
              <div className="small text-secondary mt-1">
                {conversationMode
                  ? 'Le due lingue sono parlate da due persone; il sistema rileva chi sta parlando e gira la traduzione nel verso giusto.'
                  : 'Traduce sempre dalla lingua di sinistra a quella di destra.'}
              </div>
            </div>

            <div className="d-flex justify-content-center my-4">
              <MicButton
                connected={isConnected}
                connecting={isConnecting}
                muted={isMuted}
                userSpeaking={activity.user}
                assistantSpeaking={activity.assistant}
                onConnect={connect}
                onDisconnect={disconnect}
                onToggleMute={toggleMute}
              />
            </div>

            <div className="d-flex justify-content-center align-items-center gap-2 flex-wrap">
              <StatusBadge status={status} />
              {isConnected && (
                <span className={`badge rounded-pill ${isMuted ? 'bg-warning text-dark' : 'bg-success-subtle text-success-emphasis'}`}>
                  <i className={`bi ${isMuted ? 'bi-mic-mute-fill' : 'bi-mic-fill'} me-1`}></i>
                  {isMuted ? 'Microfono in pausa' : 'Microfono attivo'}
                </span>
              )}
              {isConnected && showAutoDetect && (
                <span className="badge rounded-pill bg-warning-subtle text-warning-emphasis">
                  <i className="bi bi-arrow-repeat spinning me-1"></i>
                  In attesa: {langALanguage.flag} {langALanguage.name} / {langBLanguage.flag} {langBLanguage.name}
                </span>
              )}
              {isConnected && !showAutoDetect && (
                <span className="badge rounded-pill bg-primary-subtle text-primary-emphasis">
                  <i className="bi bi-arrow-right me-1"></i>
                  {activeSourceLanguage.flag} {activeSourceLanguage.name} → {activeTargetLanguage.flag} {activeTargetLanguage.name}
                </span>
              )}
              {isConnected && activity.assistant && (
                <span className="badge rounded-pill bg-info-subtle text-info-emphasis">
                  <i className="bi bi-volume-up-fill me-1"></i>Sta traducendo
                </span>
              )}
            </div>

            {error && (
              <div className="alert alert-danger d-flex align-items-start mt-3 mb-0" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                <div>
                  <div className="fw-semibold">Errore</div>
                  <div className="small">{error}</div>
                </div>
              </div>
            )}

            {!apiKey && (
              <div className="alert alert-info d-flex align-items-center mt-3 mb-0" role="alert">
                <i className="bi bi-info-circle-fill me-2 fs-5"></i>
                <div className="small flex-grow-1">
                  Inserisci la tua chiave API OpenAI per iniziare.
                </div>
                <button className="btn btn-sm btn-primary ms-2" onClick={() => setShowSettings(true)}>
                  <i className="bi bi-gear-fill me-1"></i>Impostazioni
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="row g-3 g-md-4">
          <div className="col-md-6">
            <TranscriptPanel
              icon="bi-mic"
              variant="from-primary"
              language={showAutoDetect ? { flag: '🎙️', name: 'Rilevamento…' } : activeSourceLanguage}
              label="Sorgente"
              text={sourceTranscript}
              speaking={activity.user}
              placeholder={transcribeInput
                ? (conversationMode
                    ? 'Parla in una delle due lingue: il sistema riconosce qual è e imposta la direzione di traduzione.'
                    : 'Inizia a parlare per vedere il testo trascritto qui.')
                : 'Trascrizione disattivata nelle impostazioni.'}
            />
          </div>
          <div className="col-md-6">
            <TranscriptPanel
              icon="bi-translate"
              variant="from-accent"
              language={showAutoDetect ? { flag: '🔄', name: 'Auto' } : activeTargetLanguage}
              label="Traduzione"
              text={translation}
              speaking={activity.assistant}
              placeholder="La traduzione apparirà qui mentre il modello risponde."
            />
          </div>
        </div>

        {showHistory && history.length > 0 && (
          <HistoryList
            items={history}
            onClear={clearHistory}
          />
        )}

        <footer className="text-center mt-5 mb-3 text-secondary small">
          <i className="bi bi-stars me-1"></i>
          Powered by OpenAI Realtime Translation · Bootstrap 5 · React
        </footer>
      </main>

      <SettingsPanel
        open={showSettings}
        onClose={() => setShowSettings(false)}
        apiKey={apiKey} setApiKey={setApiKey}
        deviceId={deviceId} setDeviceId={setDeviceId}
        devices={devices}
        autoPlayAudio={autoPlayAudio} setAutoPlayAudio={setAutoPlayAudio}
        transcribeInput={transcribeInput} setTranscribeInput={setTranscribeInput}
        showHistory={showHistory} setShowHistory={setShowHistory}
      />
    </div>
  )
}
