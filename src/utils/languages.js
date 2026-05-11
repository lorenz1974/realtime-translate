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

export function getLanguage(code) {
  return LANGUAGES.find(l => l.code === code) || LANGUAGES[0]
}
