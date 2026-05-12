import { useState } from 'react'
import { VOICES } from '../utils/languages.js'

const AVATAR_SOURCES = [
  {
    name: 'Ready Player Me',
    url: 'https://readyplayerme.com/',
    desc: 'Crea un avatar realistico full-body in 1 minuto. Esporta un URL .glb pronto all’uso.'
  },
  {
    name: 'Avaturn',
    url: 'https://avaturn.me/',
    desc: 'Avatar da una foto, esporta .glb con blendshapes compatibili ARKit.'
  },
  {
    name: 'Sketchfab',
    url: 'https://sketchfab.com/search?features=downloadable&type=models&q=arkit+head',
    desc: 'Cerca modelli gratuiti con “ARKit blendshapes”. Scarica .glb e hostalo su un CDN o nel repo.'
  }
]

export default function SettingsPanel({
  open, onClose,
  apiKey, setApiKey,
  model, setModel,
  transcriptionModel, setTranscriptionModel,
  voice, setVoice,
  deviceId, setDeviceId,
  devices,
  autoPlayAudio, setAutoPlayAudio,
  transcribeInput, setTranscribeInput,
  translationMode, setTranslationMode,
  showHistory, setShowHistory,
  showAvatar, setShowAvatar,
  avatarUrl, setAvatarUrl
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
            <div className="small text-secondary mb-3">
              <i className="bi bi-shield-lock me-1"></i>
              Resta nel tuo browser (localStorage). Per la produzione usa un backend che generi token effimeri.
            </div>

            <label className="form-label small">Modello di traduzione</label>
            <select className="form-select mb-3" value={model} onChange={e => setModel(e.target.value)}>
              <option value="gpt-realtime-translate">gpt-realtime-translate (specializzato)</option>
              <option value="gpt-realtime">gpt-realtime (generale)</option>
              <option value="gpt-4o-realtime-preview">gpt-4o-realtime-preview</option>
              <option value="gpt-4o-mini-realtime-preview">gpt-4o-mini-realtime-preview</option>
            </select>

            <label className="form-label small">Modello di trascrizione input</label>
            <select className="form-select" value={transcriptionModel} onChange={e => setTranscriptionModel(e.target.value)}>
              <option value="gpt-realtime-whisper">gpt-realtime-whisper (consigliato)</option>
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
              <option value="gpt-4o-mini-transcribe">gpt-4o-mini-transcribe</option>
              <option value="whisper-1">whisper-1 (legacy)</option>
            </select>
          </section>

          <section className="mb-4">
            <h6 className="section-title"><i className="bi bi-mic-fill me-1 text-danger"></i>Audio</h6>

            <label className="form-label small">Microfono</label>
            <select className="form-select mb-3" value={deviceId} onChange={e => setDeviceId(e.target.value)}>
              <option value="">Predefinito di sistema</option>
              {devices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Microfono ${d.deviceId.slice(0, 6)}`}
                </option>
              ))}
            </select>

            <label className="form-label small">Voce di output</label>
            <select className="form-select" value={voice} onChange={e => setVoice(e.target.value)}>
              {VOICES.map(v => (
                <option key={v.id} value={v.id}>{v.name} — {v.description}</option>
              ))}
            </select>
          </section>

          <section className="mb-4">
            <h6 className="section-title"><i className="bi bi-emoji-smile me-1 text-success"></i>Avatar 3D</h6>

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="opt-avatar"
                checked={showAvatar} onChange={e => setShowAvatar(e.target.checked)} />
              <label className="form-check-label" htmlFor="opt-avatar">
                Mostra avatar 3D parlante
              </label>
            </div>

            <label className="form-label small">URL di un avatar .glb (opzionale)</label>
            <div className="input-group mb-2">
              <input
                type="url"
                className="form-control"
                placeholder="https://…/avatar.glb"
                value={avatarUrl}
                onChange={e => setAvatarUrl(e.target.value)}
                spellCheck="false"
              />
              {avatarUrl && (
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={() => setAvatarUrl('')}
                  title="Rimuovi URL e usa l’avatar cartoon di default"
                  aria-label="Rimuovi"
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              )}
            </div>
            <div className="small text-secondary mb-3">
              <i className="bi bi-info-circle me-1"></i>
              Lascia vuoto per usare l’avatar cartoon di default. Per un avatar realistico incolla qui l’URL di un file <code>.glb</code> con blendshapes ARKit (<code>mouthOpen</code>/<code>jawOpen</code>, <code>eyeBlinkLeft/Right</code>): il lip-sync verrà attivato automaticamente.
            </div>

            <div className="avatar-sources">
              <div className="small fw-semibold mb-2 text-secondary">Sorgenti gratuite di avatar .glb:</div>
              {AVATAR_SOURCES.map(s => (
                <a
                  key={s.url}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="avatar-source-link"
                >
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-box-arrow-up-right"></i>
                    <strong>{s.name}</strong>
                  </div>
                  <div className="small text-secondary mt-1">{s.desc}</div>
                </a>
              ))}
            </div>
          </section>

          <section className="mb-4">
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

            <div className="form-check form-switch mb-3">
              <input className="form-check-input" type="checkbox" id="opt-history"
                checked={showHistory} onChange={e => setShowHistory(e.target.checked)} />
              <label className="form-check-label" htmlFor="opt-history">
                <i className="bi bi-clock-history me-1"></i> Mantieni cronologia frasi
              </label>
            </div>

            <label className="form-label small">Stile di traduzione</label>
            <div className="btn-group w-100" role="group" aria-label="Stile">
              {[
                { id: 'natural', label: 'Naturale',   icon: 'bi-stars' },
                { id: 'default', label: 'Bilanciato', icon: 'bi-sliders2' },
                { id: 'literal', label: 'Letterale',  icon: 'bi-rulers' }
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`btn btn-outline-primary ${translationMode === opt.id ? 'active' : ''}`}
                  onClick={() => setTranslationMode(opt.id)}
                >
                  <i className={`bi ${opt.icon} me-1`}></i>{opt.label}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h6 className="section-title"><i className="bi bi-lightbulb me-1 text-warning"></i>Idee da implementare</h6>
            <ul className="small text-secondary mb-0 ps-3">
              <li>Backend Node/Express per token effimeri (production-ready)</li>
              <li>Modalità conversazione bidirezionale (due voci alternate)</li>
              <li>Lip-sync per visemi (mappa fonemi su viseme_aa, viseme_O…)</li>
              <li>Espressioni emotive sull’avatar (sorride, sopracciglia)</li>
              <li>Esportazione MP3/WAV della traduzione</li>
              <li>Glossario di nomi propri / acronimi mantenuti invariati</li>
              <li>Sottotitoli sincronizzati word-by-word (delta evidenziati)</li>
            </ul>
          </section>
        </div>
      </aside>
    </>
  )
}
