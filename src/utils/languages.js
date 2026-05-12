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
