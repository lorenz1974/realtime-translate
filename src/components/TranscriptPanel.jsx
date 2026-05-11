import { useEffect, useRef, useState } from 'react'

export default function TranscriptPanel({ icon, variant, language, label, text, speaking, placeholder }) {
  const ref = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [text])

  const copy = async () => {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {}
  }

  return (
    <div className={`card transcript-card border-0 shadow-sm ${variant}`}>
      <div className="card-body p-3 p-md-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center gap-2">
            <span className={`transcript-icon ${variant}`}>
              <i className={`bi ${icon}`}></i>
            </span>
            <div>
              <div className="text-secondary letter-spaced text-uppercase">{label}</div>
              <div className="fw-semibold d-flex align-items-center gap-2">
                <span>{language.flag} {language.name}</span>
                {speaking && <span className="listening-dot" aria-hidden="true" />}
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm btn-light btn-icon"
            disabled={!text}
            onClick={copy}
            title={copied ? 'Copiato!' : 'Copia testo'}
            aria-label="Copia testo"
          >
            <i className={`bi ${copied ? 'bi-check2' : 'bi-clipboard'}`}></i>
          </button>
        </div>
        <div ref={ref} className="transcript-body">
          {text ? (
            <p className="mb-0">{text}</p>
          ) : (
            <p className="text-secondary mb-0 fst-italic">{placeholder}</p>
          )}
        </div>
      </div>
    </div>
  )
}
