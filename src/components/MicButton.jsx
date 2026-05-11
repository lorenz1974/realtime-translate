export default function MicButton({
  connected, connecting, muted,
  userSpeaking, assistantSpeaking,
  onConnect, onDisconnect, onToggleMute
}) {
  if (connecting) {
    return (
      <button className="mic-button mic-connecting" disabled aria-label="Connessione in corso">
        <div className="spinner-border" role="status" aria-hidden="true"></div>
        <span className="mic-label">Connessione</span>
      </button>
    )
  }
  if (!connected) {
    return (
      <button className="mic-button mic-idle" onClick={onConnect} aria-label="Avvia traduzione">
        <span className="mic-pulse" />
        <i className="bi bi-mic-fill"></i>
        <span className="mic-label">Avvia</span>
      </button>
    )
  }
  return (
    <div className="mic-controls">
      <button
        className={`mic-button ${muted ? 'mic-muted' : 'mic-active'} ${userSpeaking ? 'is-speaking' : ''}`}
        onClick={onToggleMute}
        aria-label={muted ? 'Riattiva microfono' : 'Metti in pausa il microfono'}
      >
        {!muted && <span className="mic-pulse" />}
        <i className={`bi ${muted ? 'bi-mic-mute-fill' : 'bi-mic-fill'}`}></i>
        <span className="mic-label">{muted ? 'Riattiva' : 'In ascolto'}</span>
        {assistantSpeaking && (
          <span className="speaker-indicator" aria-hidden="true">
            <i className="bi bi-volume-up-fill"></i>
          </span>
        )}
      </button>
      <button className="btn btn-stop" onClick={onDisconnect} aria-label="Termina sessione">
        <i className="bi bi-stop-fill me-1"></i>Termina
      </button>
    </div>
  )
}
