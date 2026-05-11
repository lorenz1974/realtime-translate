import { VAD_PRESETS, getVadPreset } from '../utils/languages.js'

export default function SpeedSelector({ value, onChange }) {
  const current = getVadPreset(value)
  return (
    <div className="speed-selector mt-3">
      <div className="d-flex justify-content-between align-items-end mb-1 gap-2 flex-wrap">
        <label className="form-label small text-secondary fw-semibold mb-0">
          <i className="bi bi-speedometer2 me-1"></i>Velocità di reazione
        </label>
        <span className="speed-hint small text-secondary text-end">
          <i className="bi bi-info-circle me-1"></i>{current.hint}
        </span>
      </div>
      <div className="btn-group w-100 speed-group" role="group" aria-label="Velocità di reazione">
        {VAD_PRESETS.map(p => (
          <button
            key={p.id}
            type="button"
            className={`btn btn-speed ${value === p.id ? 'active' : ''}`}
            onClick={() => onChange(p.id)}
            title={p.hint}
          >
            <i className={`bi ${p.icon} me-1`}></i>{p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
