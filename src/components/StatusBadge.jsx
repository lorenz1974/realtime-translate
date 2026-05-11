const STATUS = {
  disconnected: { label: 'Non connesso',  icon: 'bi-circle',       cls: 'bg-secondary-subtle text-secondary-emphasis' },
  connecting:   { label: 'Connessione…', icon: 'bi-arrow-repeat spinning', cls: 'bg-warning-subtle text-warning-emphasis' },
  connected:    { label: 'Pronto',         icon: 'bi-broadcast',    cls: 'bg-success-subtle text-success-emphasis' },
  error:        { label: 'Errore',         icon: 'bi-x-circle',     cls: 'bg-danger-subtle text-danger-emphasis' }
}

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.disconnected
  return (
    <span className={`badge rounded-pill ${s.cls}`}>
      <i className={`bi ${s.icon} me-1`}></i>{s.label}
    </span>
  )
}
