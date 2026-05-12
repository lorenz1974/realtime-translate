import { LANGUAGES } from '../utils/languages.js'

function Select({ value, onChange, exclude, label, icon }) {
  return (
    <div className="lang-select">
      <label className="form-label small text-secondary mb-1 fw-semibold">
        <i className={`bi ${icon} me-1`}></i>{label}
      </label>
      <select
        className="form-select form-select-lg"
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {LANGUAGES.filter(l => l.code !== exclude).map(l => (
          <option key={l.code} value={l.code}>{l.flag} {l.name}</option>
        ))}
      </select>
    </div>
  )
}

export default function LanguageSelector({
  source, target, onSourceChange, onTargetChange, onSwap,
  labelA = 'Da', labelB = 'A'
}) {
  return (
    <div className="row g-2 align-items-end">
      <div className="col">
        <Select
          value={source}
          onChange={onSourceChange}
          exclude={target}
          label={labelA}
          icon="bi-mic-fill"
        />
      </div>
      <div className="col-auto pb-1">
        <button
          className="btn btn-swap"
          onClick={onSwap}
          title="Inverti lingue"
          aria-label="Inverti lingue"
        >
          <i className="bi bi-arrow-left-right"></i>
        </button>
      </div>
      <div className="col">
        <Select
          value={target}
          onChange={onTargetChange}
          exclude={source}
          label={labelB}
          icon="bi-megaphone-fill"
        />
      </div>
    </div>
  )
}
