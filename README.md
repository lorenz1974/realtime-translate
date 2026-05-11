# Realtime Translate

App demo di **traduzione vocale in tempo reale**, **PWA installabile** su PC e smartphone, costruita con **React + Vite + Bootstrap 5 + Bootstrap Icons** che usa l'**OpenAI Realtime API** (modello `gpt-realtime`) tramite WebRTC.

L'utente parla nel microfono, il modello riceve l'audio in streaming e produce contemporaneamente:
- la trascrizione testuale della frase di partenza,
- la traduzione testuale nella lingua di destinazione,
- l'audio della traduzione (text-to-speech integrato del modello).

Funziona da **PC e da smartphone** grazie a `getUserMedia` + `RTCPeerConnection` standard.

> ⚠️ **Solo demo**. La chiave API viene letta dal `localStorage` del browser. Per la produzione predisporre un backend che generi token effimeri tramite `POST /v1/realtime/sessions`, in modo da non esporre la chiave principale.

---

## Caratteristiche di base

- 📱 **PWA installabile** (Add to Home Screen su iOS/Android, Install su Chrome/Edge)
- 🎙️ Microfono live (PC, iPhone, Android) via WebRTC
- 🌍 17 lingue (con bandiere e nome nativo) + modalità auto-detect della sorgente
- 🔁 Inversione lingue con un click
- 🗣️ Risposta audio della traduzione + trascrizione testuale
- 📜 Cronologia delle frasi tradotte nella sessione
- 🎚️ Indicatori di stato (connesso, in ascolto, sta parlando)
- 🧊 Glass UI moderna, gradient blob animati, mobile-first
- 💾 Tutte le preferenze persistono in `localStorage`
- 🔗 Immagine Open Graph + Twitter Card per link sharing su social
- 📦 Service Worker con Workbox (cache app shell, **NetworkOnly** sull'API OpenAI)

## Opzioni implementate (toggle nelle impostazioni)

- 🔊 Attiva/disattiva riproduzione audio della traduzione
- 📝 Attiva/disattiva trascrizione della sorgente (Whisper)
- 🎨 8 voci di output (alloy, ash, ballad, coral, echo, sage, shimmer, verse)
- 🎯 3 stili di traduzione: **Naturale** · **Letterale** · **Bilanciato**
- 🎤 Selezione esplicita del microfono (quando ce ne sono più di uno)
- 🧠 Selezione del modello Realtime (gpt-realtime, gpt-4o-realtime-preview, gpt-4o-mini-realtime-preview)
- 🕘 Visualizzazione della cronologia on/off

## Idee che puoi scegliere se implementare in seguito

| Idea | Note |
|------|------|
| Backend Node/Express per token effimeri | Sostituisce l'inserimento manuale della chiave |
| Modalità conversazione bidirezionale | Due voci alternate per dialogo dal vivo |
| Selettore di formalità (tu/Lei) | Aggiunto come istruzione nel system prompt |
| Esportazione MP3/WAV della traduzione | Registrazione MediaRecorder lato client |
| Glossario personalizzato | Dizionario di nomi propri / acronimi mantenuti |
| Push notification per riconnessione | Tramite il service worker già attivo |
| Tema scuro/chiaro automatico | Media query `prefers-color-scheme` |
| Sottotitoli sincronizzati / karaoke | Highlight parola per parola sui delta |
| Salvataggio cronologia su file/JSON o cloud | Export `.json` o sync con backend |
| Riconoscimento del parlante (diarization) | Più speaker, etichette distinte |
| Modalità offline parziale | Cache delle frasi già tradotte |

---

## Installazione

Richiede **Node.js 18+**.

```bash
npm install
npm run assets   # genera favicon, icone PWA e og-image (una sola volta)
npm run dev
```

L'app gira su `http://localhost:5173`.

> `npm run dev` non genera automaticamente gli asset per essere veloce: lancia `npm run assets` manualmente la prima volta. `npm run build` invece li rigenera automaticamente (`prebuild`).

### Test da smartphone

Vite è configurato con `host: true`, quindi è già esposto sulla LAN. Per accedere dallo smartphone:

```bash
npm run dev
# nota l'indirizzo Network: http://192.168.x.x:5173
```

Il microfono in browser richiede **HTTPS** se non sei su `localhost`. Per testare via LAN da mobile usa uno tra:

- `mkcert` per generare certificati di sviluppo,
- `ngrok http 5173` (tunnel HTTPS pubblico),
- oppure deploy su Vercel/Netlify (HTTPS automatico).

### Installare l'app come PWA

- **Chrome / Edge (desktop)** → icona di installazione nella omnibox, oppure menu ⋮ → *Installa Realtime Translate*
- **iOS Safari** → pulsante Condividi → *Aggiungi alla schermata Home*
- **Android Chrome** → banner "Aggiungi alla schermata Home" o menu ⋮ → *Installa app*

Una volta installata, l'app gira in finestra standalone con la sua icona, status bar tematizzata e supporto offline dell'app shell (l'API OpenAI rimane sempre `NetworkOnly`, per sicurezza).

---

## Asset PWA & condivisione

Tutte le immagini sono derivate da due **soli file SVG sorgente**, modificabili a piacere:

```
public/icon.svg        # 512x512 — master per favicon e icone PWA
public/og-image.svg    # 1200x630 — master per immagine Open Graph / Twitter Card
```

Lo script `npm run assets` genera in `public/` (file gitignorati):

| File | Sorgente | Uso |
|---|---|---|
| `favicon.svg`, `favicon.ico` | `icon.svg` | favicon browser |
| `apple-touch-icon-180x180.png` | `icon.svg` | iOS home screen |
| `maskable-icon-512x512.png` | `icon.svg` | Android adaptive icon |
| `pwa-64x64.png`, `pwa-192x192.png`, `pwa-512x512.png` | `icon.svg` | manifest PWA |
| `og-image.png` (1200x630) | `og-image.svg` | Open Graph + Twitter Card |

Le icone PWA usano [`@vite-pwa/assets-generator`](https://github.com/vite-pwa/assets-generator) con il preset `minimal-2023`.
L'immagine OG viene rasterizzata da SVG a PNG con [`sharp`](https://sharp.pixelplumbing.com/) tramite `scripts/render-og.mjs`.

Per rigenerare manualmente:

```bash
npm run assets:icons   # solo favicon + icone PWA
npm run assets:og      # solo og-image.png
npm run assets         # entrambi
```

In produzione (`npm run build`) lo step `prebuild` rigenera tutto in automatico.

---

## Configurazione

1. Apri l'app nel browser
2. Clicca l'**icona ingranaggio** in alto a destra
3. Inserisci la tua **chiave API OpenAI** (`sk-…`)
4. Scegli **modello**, **voce**, **microfono** e opzioni
5. Chiudi il pannello, scegli **lingua di partenza** e **lingua di arrivo**
6. Premi il **pulsante microfono** al centro e parla

La chiave resta esclusivamente nel `localStorage` del tuo browser. Non viene inviata da nessuna parte se non direttamente all'endpoint `https://api.openai.com/v1/realtime`.

---

## Sul nome del modello

Il brief originale citava `gpt-realtime-translate`, che **non è un modello OpenAI pubblico**. Il modello GA equivalente è `gpt-realtime` (più i preview `gpt-4o-realtime-preview` / `gpt-4o-mini-realtime-preview`). L'app utilizza l'endpoint `POST /v1/realtime` con un *system prompt* specializzato per la traduzione, ottenendo lo stesso comportamento di un modello dedicato. Il selettore del modello è esposto nelle impostazioni: si può inserire qualsiasi identificatore compatibile.

---

## Architettura

```
┌─────────────────────────────────────────────────────────┐
│ Browser (PWA: React + Bootstrap + Workbox SW)               │
│                                                             │
│  ┌───────────────┐  ┌────────────────────┐                  │
│  │ UI controls   │  │ useRealtime hook   │                  │
│  └───────────────┘  └─────────┬──────────┘                  │
│                              │                             │
│                     ┌────────▼─────────┐                    │
│                     │ RealtimeClient   │                    │
│                     │ (WebRTC + DC)    │                    │
│                     └─┬───────────────┬┘                    │
│        getUserMedia() │               │ DataChannel JSON    │
│                     ┌─▼────────────┐  │                    │
│                     │ Microfono     │  │                    │
│                     └──────────────┘  │                    │
│                                       ▼                    │
│                              RTCPeerConnection             │
└──────────────────────────────────┬──────────────────────────┘
                                   │ SDP + audio RTP
                                   ▼
                  https://api.openai.com/v1/realtime
```

Il client invia un evento `session.update` con le `instructions` di traduzione (basate sulle lingue scelte), riceve sul `MediaStreamTrack` audio remoto la voce tradotta e sul `DataChannel` gli eventi:

- `input_audio_buffer.speech_started` / `speech_stopped`
- `conversation.item.input_audio_transcription.delta` / `.completed`
- `response.audio_transcript.delta` / `.done`
- `response.done`

---

## Struttura del progetto

```
realtime-translate/
├── index.html                      # entrypoint, contiene meta PWA / OG / Twitter
├── vite.config.js                  # configurazione Vite + VitePWA
├── pwa-assets.config.js            # configurazione @vite-pwa/assets-generator
├── package.json
├── public/
│   ├── icon.svg                    # master 512x512 (favicon + icone PWA)
│   ├── og-image.svg                # master 1200x630 (Open Graph)
│   └── *.png / *.ico               # generati da `npm run assets`
├── scripts/
│   └── render-og.mjs               # rasterizza og-image.svg → .png con sharp
└── src/
    ├── main.jsx                    # entry point + registrazione service worker
    ├── App.jsx                     # composizione UI principale
    ├── styles.css                  # stili custom (glass UI, gradient, mobile)
    ├── utils/
    │   ├── languages.js            # elenco lingue + voci
    │   └── realtimeClient.js       # wrapper WebRTC OpenAI Realtime
    ├── hooks/
    │   └── useRealtimeTranslation.js
    └── components/
        ├── Header.jsx
        ├── LanguageSelector.jsx
        ├── MicButton.jsx
        ├── TranscriptPanel.jsx
        ├── HistoryList.jsx
        ├── SettingsPanel.jsx
        └── StatusBadge.jsx
```

---

## Avvertenze

- Su iOS Safari l'autoplay audio richiede una prima interazione utente: il tap sul pulsante microfono soddisfa questo requisito.
- WebRTC richiede HTTPS in produzione e accesso al microfono autorizzato dal browser.
- L'API OpenAI è marcata `NetworkOnly` nel service worker: nessuna richiesta verso `api.openai.com` viene mai cacheata.
- La demo non implementa rate limiting né gestione costi: tenere d'occhio l'uso dell'API.

---

Demo costruita per esplorare le potenzialità della Realtime API di OpenAI.
