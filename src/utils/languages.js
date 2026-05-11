export const LANGUAGES = [
  { code: 'auto', name: 'Auto rileva',   flag: '🌐', native: 'the language the speaker uses' },
  { code: 'it',   name: 'Italiano',      flag: '🇮🇹', native: 'Italian' },
  { code: 'en',   name: 'Inglese',       flag: '🇬🇧', native: 'English' },
  { code: 'es',   name: 'Spagnolo',      flag: '🇪🇸', native: 'Spanish' },
  { code: 'fr',   name: 'Francese',      flag: '🇫🇷', native: 'French' },
  { code: 'de',   name: 'Tedesco',       flag: '🇩🇪', native: 'German' },
  { code: 'pt',   name: 'Portoghese',    flag: '🇵🇹', native: 'Portuguese' },
  { code: 'nl',   name: 'Olandese',      flag: '🇳🇱', native: 'Dutch' },
  { code: 'pl',   name: 'Polacco',       flag: '🇵🇱', native: 'Polish' },
  { code: 'ru',   name: 'Russo',         flag: '🇷🇺', native: 'Russian' },
  { code: 'tr',   name: 'Turco',         flag: '🇹🇷', native: 'Turkish' },
  { code: 'el',   name: 'Greco',         flag: '🇬🇷', native: 'Greek' },
  { code: 'ar',   name: 'Arabo',         flag: '🇸🇦', native: 'Arabic' },
  { code: 'hi',   name: 'Hindi',         flag: '🇮🇳', native: 'Hindi' },
  { code: 'zh',   name: 'Cinese',        flag: '🇨🇳', native: 'Mandarin Chinese' },
  { code: 'ja',   name: 'Giapponese',    flag: '🇯🇵', native: 'Japanese' },
  { code: 'ko',   name: 'Coreano',       flag: '🇰🇷', native: 'Korean' }
]

export const VOICES = [
  { id: 'alloy',   name: 'Alloy',   description: 'neutra, equilibrata' },
  { id: 'ash',     name: 'Ash',     description: 'profonda, calda' },
  { id: 'ballad',  name: 'Ballad',  description: 'morbida, dolce' },
  { id: 'coral',   name: 'Coral',   description: 'vivace, espressiva' },
  { id: 'echo',    name: 'Echo',    description: 'chiara, diretta' },
  { id: 'sage',    name: 'Sage',    description: 'pacata, riflessiva' },
  { id: 'shimmer', name: 'Shimmer', description: 'brillante, cristallina' },
  { id: 'verse',   name: 'Verse',   description: 'melodica, espressiva' }
]

// Preset di reattività (server-side VAD). Più sono bassi i valori,
// più il modello inizia a tradurre presto e l'esperienza si avvicina
// all'interpretazione simultanea — a costo di più "falsi turni".
export const VAD_PRESETS = [
  {
    id: 'safe',
    label: 'Sicuro',
    icon: 'bi-shield-check',
    hint: 'Aspetta pause chiare (~700ms). Ideale per frasi lunghe.',
    threshold: 0.5,
    prefix_padding_ms: 350,
    silence_duration_ms: 700
  },
  {
    id: 'balanced',
    label: 'Bilanciato',
    icon: 'bi-speedometer2',
    hint: 'Buon trade-off velocità/precisione (~400ms).',
    threshold: 0.45,
    prefix_padding_ms: 250,
    silence_duration_ms: 400
  },
  {
    id: 'fast',
    label: 'Reattivo',
    icon: 'bi-lightning-charge-fill',
    hint: 'Quasi simultaneo (~200ms). Può tagliare a metà frase.',
    threshold: 0.4,
    prefix_padding_ms: 150,
    silence_duration_ms: 200
  }
]

export function getVadPreset(id) {
  return VAD_PRESETS.find(p => p.id === id) || VAD_PRESETS[1]
}

export function getLanguage(code) {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0]
}
