export const LANGUAGES = [
  { code: 'it', name: 'Italiano',   flag: '🇮🇹' },
  { code: 'en', name: 'Inglese',    flag: '🇬🇧' },
  { code: 'es', name: 'Spagnolo',   flag: '🇪🇸' },
  { code: 'fr', name: 'Francese',   flag: '🇫🇷' },
  { code: 'de', name: 'Tedesco',    flag: '🇩🇪' },
  { code: 'pt', name: 'Portoghese', flag: '🇵🇹' },
  { code: 'nl', name: 'Olandese',   flag: '🇳🇱' },
  { code: 'pl', name: 'Polacco',    flag: '🇵🇱' },
  { code: 'ru', name: 'Russo',      flag: '🇷🇺' },
  { code: 'tr', name: 'Turco',      flag: '🇹🇷' },
  { code: 'el', name: 'Greco',      flag: '🇬🇷' },
  { code: 'ar', name: 'Arabo',      flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi',      flag: '🇮🇳' },
  { code: 'zh', name: 'Cinese',     flag: '🇨🇳' },
  { code: 'ja', name: 'Giapponese', flag: '🇯🇵' },
  { code: 'ko', name: 'Coreano',    flag: '🇰🇷' }
]

export function getLanguage(code) {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0]
}

// Lightweight language detection used in conversation mode to decide who
// is speaking. Two-pronged: Unicode script ranges for non-latin alphabets,
// stop-word counting for latin ones. Returns the candidate code or null if
// the signal is too weak to decide.
const STOP_WORDS = {
  it: ['il','la','di','che','è','e','un','una','non','per','con','sono','come','più','ma','anche','questo','sì','cosa','molto','dove','quando','perché','quello','vero'],
  en: ['the','of','to','and','a','in','is','it','you','that','was','for','on','are','with','as','have','this','be','what','i','do','they','we'],
  es: ['el','la','de','que','y','en','un','es','no','para','con','una','su','los','del','lo','pero','más','esto','sí','cómo','está','soy'],
  fr: ['le','la','de','et','à','est','en','un','que','pour','dans','ne','sur','avec','pas','ce','plus','mais','je','vous','c’est','oui'],
  de: ['der','die','und','in','den','ist','das','nicht','von','sie','mit','sich','auf','für','eine','aber','ich','ja','du','wir'],
  pt: ['o','a','de','que','e','do','da','em','um','para','com','não','uma','os','no','se','mas','mais','sim','você','está'],
  nl: ['de','het','een','en','in','is','dat','van','op','te','met','voor','niet','ook','maar','ik','je','wij','ja'],
  pl: ['i','w','na','jest','do','nie','że','z','to','się','jak','co','ale','tak','tylko'],
  tr: ['ve','bir','bu','için','da','de','ile','çok','ama','ne','evet','olarak','mı','mi']
}

const SCRIPT_RANGES = {
  zh: /[一-鿿]/,
  ja: /[぀-ゟ゠-ヿ]/,
  ko: /[가-힯]/,
  ar: /[؀-ۿ]/,
  ru: /[Ѐ-ӿ]/,
  el: /[Ͱ-Ͽ]/,
  hi: /[ऀ-ॿ]/
}

export function detectLanguage(text, candidates) {
  if (!text || !candidates || candidates.length < 2) return null
  const t = text.toLowerCase().trim()
  if (t.length < 3) return null

  // 1. Script-based detection wins for non-latin alphabets
  for (const code of candidates) {
    const re = SCRIPT_RANGES[code]
    if (re) {
      const matches = t.match(new RegExp(re.source, 'g'))
      if (matches && matches.length >= 2) return code
    }
  }

  // 2. Stop-word counting for latin scripts
  const tokens = t.split(/[\s.,!?;:\-'"()¿¡…]+/).filter(Boolean)
  if (tokens.length === 0) return null
  let best = null
  let bestScore = 0
  for (const code of candidates) {
    const words = STOP_WORDS[code]
    if (!words) continue
    let score = 0
    for (const tok of tokens) if (words.includes(tok)) score++
    if (score > bestScore) { bestScore = score; best = code }
  }
  // Need at least 2 hits to commit; otherwise the signal is too weak.
  return bestScore >= 2 ? best : null
}
