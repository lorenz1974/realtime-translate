export default function Header({ onOpenSettings }) {
  return (
    <header className="app-header">
      <div className="container d-flex align-items-center justify-content-between py-3">
        <div className="d-flex align-items-center gap-2">
          <div className="logo-badge">
            <i className="bi bi-translate"></i>
          </div>
          <div>
            <div className="fw-bold lh-1">Realtime Translate</div>
            <div className="text-secondary small">demo · OpenAI Realtime</div>
          </div>
        </div>
        <button
          className="btn btn-light btn-icon shadow-sm"
          onClick={onOpenSettings}
          aria-label="Impostazioni"
          title="Impostazioni"
        >
          <i className="bi bi-gear-fill"></i>
        </button>
      </div>
    </header>
  )
}
