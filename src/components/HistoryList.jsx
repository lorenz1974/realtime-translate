export default function HistoryList({ items, sourceLanguage, targetLanguage, onClear }) {
  return (
    <section className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0 d-flex align-items-center">
          <i className="bi bi-clock-history text-primary me-2"></i>
          Cronologia
          <span className="badge bg-primary-subtle text-primary-emphasis ms-2">{items.length}</span>
        </h5>
        <button className="btn btn-sm btn-outline-secondary" onClick={onClear}>
          <i className="bi bi-trash me-1"></i>Pulisci
        </button>
      </div>
      <div className="vstack gap-2">
        {items.map(item => (
          <div key={item.id} className="card history-card border-0 shadow-sm">
            <div className="card-body py-3">
              <div className="row g-2">
                <div className="col-md-6">
                  <div className="small text-secondary mb-1">
                    {sourceLanguage.flag} {sourceLanguage.name}
                  </div>
                  <div className="history-text">{item.source || <em className="text-secondary">—</em>}</div>
                </div>
                <div className="col-md-6 border-start-md ps-md-3">
                  <div className="small text-secondary mb-1">
                    {targetLanguage.flag} {targetLanguage.name}
                  </div>
                  <div className="history-text fw-medium">{item.translation || <em className="text-secondary">—</em>}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
