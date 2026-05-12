import { useState } from 'react'

export default function SettingsPanel({
  open, onClose,
  apiKey, setApiKey,
  deviceId, setDeviceId,
  devices,
  autoPlayAudio, setAutoPlayAudio,
  transcribeInput, setTranscribeInput,
  showHistory, setShowHistory
}) {
  const [showKey, setShowKey] = useState(false)

  return (
    <>
      <div className={`settings-backdrop ${open ? 'show' : ''}`} onClick={onClose} />
      <aside
        className={`settings-drawer ${open ? 'show' : ''}`}
        role="dialog"
        aria-modal={open}
        aria-label="Impostazioni"
      >
        <header className="settings-header">
          <h5 className="mb-0">
            <i className="bi bi-gear-fill me-2 text-primary"></i>Impostazioni
          </h5>
          <button type="button" className="btn btn-light btn-icon" aria-label="Chiudi" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
        </header>

        <div className="settings-body">
          <section className="mb-4">
            <h6 className="section-title"><i className="bi bi-key-fill me-1 text-warning"></i>Connessione</h6>

            <label className="form-label small">Chiave API OpenAI</label>
            <div className="input-group mb-2">
              <input
                type={showKey ? 'text' : 'password'}
                className="form-control"
                placeholder="sk-…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={() => setShowKey(s => !s)}
                aria-label={showKey ? 'Nascondi chiave' : 'Mostra chiave'}
              >
                <i className={`bi ${showKey ? 'bi-eye-slash' : 'bi-eye'}`}></i>
              </button>
            </div>
            <div className="small text-secondary mb-2">
              <i className="bi bi-shield-lock me-1"></i>
              Resta nel tuo browser (localStorage). Per la produzione usa un backend che generi token effimeri.
            </div>
            <div className="small text-secondary">
              <i className="bi bi-cpu me-1"></i>
              Motore: <code>gpt-realtime-translate</code> · trascrizione: <code>gpt-realtime-whisper</code>.
            </div>
          </section>

          <section className="mb-4">
            <h6 className="section-title"><i className="bi bi-mic-fill me-1 text-danger"></i>Microfono</h6>
            <select className="form-select" value={deviceId} onChange={e => setDeviceId(e.target.value)}>
              <option value="">Predefinito di sistema</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfono ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>
          </section>

          <section>
            <h6 className="section-title"><i className="bi bi-sliders me-1 text-info"></i>Opzioni</h6>

            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="opt-autoplay"
                checked={autoPlayAudio} onChange={e => setAutoPlayAudio(e.target.checked)} />
              <label className="form-check-label" htmlFor="opt-autoplay">
                <i className="bi bi-volume-up me-1"></i> Riproduci audio della traduzione
              </label>
            </div>

            <div className="form-check form-switch mb-2">
              <input className="form-check-input" type="checkbox" id="opt-transcribe"
                checked={transcribeInput} onChange={e => setTranscribeInput(e.target.checked)} />
              <label className="form-check-label" htmlFor="opt-transcribe">
                <i className="bi bi-card-text me-1"></i> Mostra trascrizione sorgente
              </label>
            </div>

            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id="opt-history"
                checked={showHistory} onChange={e => setShowHistory(e.target.checked)} />
              <label className="form-check-label" htmlFor="opt-history">
                <i className="bi bi-clock-history me-1"></i> Mantieni cronologia frasi
              </label>
            </div>
          </section>
        </div>
      </aside>
    </>
  )
}
