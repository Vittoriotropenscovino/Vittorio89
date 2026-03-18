# TravelSphere - Documentazione Tecnica Completa

## PANORAMICA PROGETTO

**TravelSphere** è un'app React Native/Expo per catalogare e visualizzare memorie di viaggio su un globo 3D interattivo. Tutti i dati sono salvati localmente sul dispositivo (GDPR-compliant, nessun backend/server).

**Tech Stack:**
- Framework: React Native 0.76 + Expo SDK 52
- Linguaggio: TypeScript 5.3
- Globo 3D: globe.gl (renderizzato in WebView)
- Stato: React Context (AppContext)
- Storage: AsyncStorage (metadati) + expo-file-system (media)
- Autenticazione: expo-local-authentication (biometrica)
- Animazioni: react-native-reanimated
- Geocoding: Nominatim + Photon + expo-location (catena di fallback)
- Build: EAS (Expo Application Services)

**Orientamento:** Landscape (forzato via expo-screen-orientation)
**Tema Scuro:** Sì
**Multi-lingua:** Italiano, English, Español, Français, Deutsch, Português, 中文, 日本語

---

## ARCHITETTURA APP

L'app usa un'architettura **single-screen con modali sovrapposti**, SENZA React Navigation router. Tutta la UI è composta da modali sopra un globo 3D fullscreen.

**Gerarchia Componenti:**

```
App.tsx (root)
└── ErrorBoundary (recovery errori)
    └── AppProvider (React Context: lingua, settings, traduzioni)
        └── SafeAreaProvider
            └── AppContent
                ├── Layer 0: EarthGlobe (globo 3D, WebView + globe.gl)
                ├── Layer 1: UI Overlay
                │   ├── Header (logo, menu hamburger)
                │   ├── OfflineBanner (stato rete)
                │   ├── Pulsanti top-right (cast, exit, version)
                │   ├── Stats bottom-left (viaggi, media, paesi)
                │   ├── Welcome overlay (stato vuoto)
                │   └── Pulsanti aggiungi (travel lines, itinerary, + trip)
                ├── Layer 2: Modali
                │   ├── TripForm (crea/modifica viaggio)
                │   ├── MemoryViewer (galleria media)
                │   ├── TripSidebar (slide-in animato)
                │   ├── SettingsScreen
                │   ├── StatsScreen
                │   ├── CalendarView
                │   ├── ItineraryManager
                │   ├── PrivacyPolicy
                │   ├── TermsOfService
                │   └── SaveConfirmation (toast)
                ├── Gate 1: OnboardingScreen (primo avvio)
                ├── Gate 2: GDPRConsent (gate privacy)
                └── Gate 3: Auth biometrica (se abilitata)
```

---

## STRUTTURA FILE PROGETTO

```
/Vittorio89/
├── src/
│   ├── components/ (16 file)
│   │   ├── EarthGlobe.tsx        (integrazione globe.gl, ~800 righe)
│   │   ├── TripForm.tsx          (crea/modifica viaggi, ~500 righe)
│   │   ├── MemoryViewer.tsx      (galleria media, ~250 righe)
│   │   ├── TripSidebar.tsx       (sidebar lista viaggi, ~400 righe)
│   │   ├── SettingsScreen.tsx    (modale impostazioni, ~400 righe)
│   │   ├── StatsScreen.tsx       (statistiche viaggio, ~157 righe)
│   │   ├── CalendarView.tsx      (browser calendario, ~191 righe)
│   │   ├── ItineraryManager.tsx  (UI itinerari, ~250 righe)
│   │   ├── OnboardingScreen.tsx  (tutorial primo avvio, ~200 righe)
│   │   ├── GDPRConsent.tsx       (gate consenso privacy, ~125 righe)
│   │   ├── PrivacyPolicy.tsx     (testo legale privacy, ~94 righe)
│   │   ├── TermsOfService.tsx    (testo legale termini, ~94 righe)
│   │   ├── SaveConfirmation.tsx  (toast notifica, ~69 righe)
│   │   ├── OfflineBanner.tsx     (stato rete, ~52 righe)
│   │   ├── ErrorBoundary.tsx     (recovery errori, ~139 righe)
│   │   └── index.ts              (barrel export)
│   ├── contexts/
│   │   └── AppContext.tsx         (settings globali + lingua, ~107 righe)
│   ├── services/
│   │   └── StorageService.ts     (AsyncStorage + FileSystem, ~184 righe)
│   ├── types/
│   │   └── index.ts              (interfacce TypeScript)
│   ├── i18n/
│   │   └── translations.ts       (8 lingue, 150+ chiavi)
│   └── utils/
│       ├── geocoding.ts           (Nominatim + fallback, ~62 righe)
│       └── countryFlags.ts        (conversione emoji bandiere, ~21 righe)
├── App.tsx                        (entry point principale, ~24 KB)
├── app.json                       (config Expo)
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── eas.json                       (config build EAS)
└── package.json
```

---

## FILE PRINCIPALI - DETTAGLIO

### App.tsx (~24 KB) - Shell Principale

È il cuore dell'app. Gestisce TUTTO lo stato e orchestra tutti i modali.

**Stato gestito:**
- `trips: Trip[]` - array di tutti i viaggi salvati
- `itineraries: Itinerary[]` - raggruppamenti itinerari
- `activeModal: string | null` - quale modale è attualmente visibile
- `selectedTrip: Trip | null` - viaggio selezionato per il viewer
- `sidebarOpen: boolean` - visibilità sidebar laterale
- `authenticated: boolean` - stato blocco biometrico
- `showSaveConfirm: boolean` - visibilità toast salvataggio
- `isLoading: boolean` - stato caricamento iniziale

**Funzioni chiave:**
- `handleSaveTrip(tripData)` - crea nuovo viaggio (genera ID con Date.now()) o aggiorna esistente, gestisce appartenenza a itinerario, auto-fly globo alla posizione
- `handleDeleteTrip(tripId)` - rimuove viaggio dallo stato e dal disco (media files)
- `handleToggleFavorite(tripId)` - marca/smarca come preferito
- `handleCreateItinerary(name)` - crea nuovo itinerario con ID unico
- `handleDeleteItinerary(id)` - rimuove itinerario, orfana i viaggi (rimuove itineraryId)
- `handleRenameItinerary(id, newName)` - aggiorna nome itinerario
- `handleOnboardingComplete()` - marca onboarding come completato nelle settings
- `handleGDPRAccept()` - accetta consenso privacy nelle settings

**Logica di avvio:**
1. Carica fonts con expo-font
2. AppProvider carica settings da AsyncStorage
3. AppContent verifica isSettingsLoaded
4. Carica trips + itineraries da StorageService
5. Se biometricEnabled → prompt autenticazione
6. Se !hasSeenOnboarding → mostra OnboardingScreen
7. Se !hasAcceptedGDPR → mostra GDPRConsent
8. Mostra UI principale (Globo + Overlay)

**Auto-save:** useEffect osserva trips e itineraries → se non in loading, salva automaticamente su AsyncStorage

**Fog of War:** Calcola `visitedCountries` = Set di countryCode da tutti i viaggi non-wishlist

**Nasconde barra Android:** Usa expo-navigation-bar per nascondere la barra di navigazione

---

### src/types/index.ts - Tipi TypeScript

```typescript
// 8 categorie di tag per i viaggi
type TripTag = 'sea' | 'mountain' | 'city' | 'adventure' | 'culture' | 'food' | 'nature' | 'romantic';

// Elemento media (foto o video)
interface MediaItem {
  uri: string;           // percorso file locale
  type: 'image' | 'video';
  width: number;
  height: number;
}

// Viaggio - entità principale
interface Trip {
  id: string;              // ID unico (Date.now().toString())
  title: string;           // nome del viaggio
  locationName: string;    // nome luogo (es. "Roma, Italia")
  latitude: number;        // coordinata GPS
  longitude: number;       // coordinata GPS
  date: string;            // formato YYYY-MM-DD
  notes: string;           // note libere
  createdAt: string;       // ISO date di creazione
  media: MediaItem[];      // array foto/video
  country?: string;        // nome paese (es. "Italy")
  countryCode?: string;    // codice ISO (es. "IT")
  tags: TripTag[];         // categorie
  isFavorite: boolean;     // preferito
  isWishlist: boolean;     // viaggio desiderato (non ancora fatto)
  itineraryId?: string;    // appartenenza a itinerario
  showArc?: boolean;       // mostra arco sul globo
}

// Itinerario - raggruppamento viaggi
interface Itinerary {
  id: string;
  name: string;
  tripIds: string[];       // riferimenti ai viaggi
  createdAt: string;
}

// Posizione casa dell'utente
interface HomeLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  countryCode?: string;
}

// Props del componente globo
interface EarthGlobeProps {
  trips: Trip[];
  onPinClick: (tripId: string) => void;
  targetCoordinates?: { lat: number; lng: number; altitude?: number };
  homeLocation?: HomeLocation;
  itineraries?: Itinerary[];
  showTravelLines?: boolean;
  visitedCountries?: string[];      // codici paese per fog of war
  flythroughStops?: { lat: number; lng: number }[];
}

// Configurazione tag con icona e colore
const TAG_CONFIG = {
  sea: { icon: 'water', color: '#06B6D4' },
  mountain: { icon: 'mountain', color: '#10B981' },
  city: { icon: 'business', color: '#8B5CF6' },
  adventure: { icon: 'compass', color: '#F59E0B' },
  culture: { icon: 'library', color: '#EC4899' },
  food: { icon: 'restaurant', color: '#EF4444' },
  nature: { icon: 'leaf', color: '#22C55E' },
  romantic: { icon: 'heart', color: '#F43F5E' },
};
```

---

### src/contexts/AppContext.tsx - Provider Globale

Fornisce settings globali e funzione di traduzione a tutta l'app.

**AppSettings (persistite in AsyncStorage):**
```typescript
interface AppSettings {
  language: Language;           // 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja'
  biometricEnabled: boolean;   // blocco biometrico attivo
  hasSeenOnboarding: boolean;  // tutorial completato
  hasAcceptedGDPR: boolean;    // consenso privacy accettato
  homeLocation?: HomeLocation; // posizione casa
  showTravelLines?: boolean;   // mostra linee viaggio sul globo
}
```

**Chiave storage:** `@travelsphere_settings`

**Hook esposto:** `useApp()` ritorna:
- `t(key: string)` → stringa tradotta nella lingua corrente
- `setLanguage(lang)` → cambia lingua e persiste
- `language` → lingua corrente
- `settings` → oggetto AppSettings completo
- `updateSettings(partial)` → aggiorna e persiste parzialmente

---

### src/services/StorageService.ts - Servizio Storage

Astrazione unificata per AsyncStorage (metadati) + expo-file-system (media).

**Metodi:**
```typescript
saveTrips(trips: Trip[]): Promise<void>
// Serializza e salva in AsyncStorage[@travelsphere_trips]

loadTrips(): Promise<Trip[]>
// Carica da AsyncStorage, su native verifica che i file media esistano ancora

deleteTrip(tripId: string, trips: Trip[]): Promise<Trip[]>
// Rimuove viaggio dall'array + cancella file media dal disco

saveItineraries(itineraries: Itinerary[]): Promise<void>
loadItineraries(): Promise<Itinerary[]>

clearAll(): Promise<void>
// Cancella TUTTO: AsyncStorage + directory media

getStorageInfo(): Promise<{ tripCount: number, mediaSize: number }>
```

**Directory media:** `FileSystem.documentDirectory + 'media/'`

---

### src/components/EarthGlobe.tsx (~800 righe) - Globo 3D

Il componente più complesso. È una WebView che contiene una pagina HTML con globe.gl (libreria WebGL per globi 3D).

**Struttura del file:**
- Righe 1-13: Import React Native
- Righe 14-520: Template HTML/JS inline (stringa `GLOBE_HTML`)
- Righe 521+: Componente React che wrappa la WebView

**Template HTML interno contiene:**

#### Sfondo Stelle (canvas separato)
- 250 stelle con posizioni random
- Effetto tremolio (flicker) con seno + fase random
- Disegnate su canvas 2D sotto il globo

#### Librerie Caricate da CDN
- topojson-client v3 (per parsare dati mappa)
- globe.gl v2 (libreria globo 3D basata su Three.js)
- world-atlas v2 countries-110m.json (dati geometria paesi)

#### Configurazione Globo (funzione `go()`)

**Material del globo:**
- Colore: `#122d54` (blu navy profondo)
- Emissive: `#0d3560` (bagliore blu scuro)
- Emissive intensity: 0.5
- Shininess: 5

**Atmosfera:**
- Colore: `#00d4ff` (cyan)
- Altitudine: 0.25 (spessore atmosfera)

**Illuminazione (THREE.js):**
- Luce direzionale 1: cyan `0x00d4ff`, intensità 0.5, posizione (-200, 100, -200)
- Luce direzionale 2: blu `0x4488ff`, intensità 0.3, posizione (200, -50, 100)
- Luce ambientale: blu scuro `0x1a1a44`, intensità 0.5

**Halo esterno:**
- Sfera `r=102`, colore cyan, opacity 0.1, BackSide

**Griglia wireframe:**
- 5 linee di latitudine (-60°, -30°, 0°, 30°, 60°), cyan, opacity 0.09
- 12 linee di longitudine (ogni 30°), cyan, opacity 0.09
- Anello scanner rotante sull'equatore, opacity pulsante 0.06-0.12

#### Fog of War (Esagoni Paese)
```javascript
// Paesi visitati
hexPolygonColor: 'rgba(0,230,255,0.85)'  // cyan luminoso
hexPolygonAltitude: 0.015                 // leggermente elevati

// Paesi non visitati
hexPolygonColor: 'rgba(0,180,255,0.2)'   // blu scuro tenue
hexPolygonAltitude: 0.006                 // piatti

hexPolygonResolution: 3                    // dimensione esagoni
hexPolygonMargin: 0.55                     // gap tra esagoni
```

#### Bordi Paesi (Poligoni)
```javascript
// Visitati
polygonCapColor: 'rgba(0,220,255,0.1)'
polygonSideColor: 'rgba(0,220,255,0.25)'
polygonStrokeColor: 'rgba(0,230,255,0.8)'

// Non visitati
polygonCapColor: 'rgba(0,0,0,0)'
polygonSideColor: 'rgba(0,200,255,0.05)'
polygonStrokeColor: 'rgba(0,220,255,0.25)'
```

#### Pin dei Viaggi
```javascript
// Colori pin
Home:     '#FFD700' (oro)
Trip:     '#EF4444' (rosso)
Wishlist: '#EC4899' (rosa)

// Dimensioni (scalano con zoom)
pointRadius: isHome ? 0.25+0.15*zoomFactor : 0.12+0.10*zoomFactor
pointAltitude: 0.01+0.04*zoomFactor
```

#### Ring Pulsanti
- Velocità propagazione: 2.5
- Periodo ripetizione: 1200ms
- Raggio max: 0.6 + 1.2 * zoomFactor
- Colore ring: oro (home), rosso (trip), rosa (wishlist)

#### Label (Titoli Viaggio)
- Opacity graduale basata su altitudine camera:
  - altitude <= 0.5: opacity piena (0.95)
  - altitude >= 1.2: invisibile (0.0)
  - Fra 0.5 e 1.2: fade lineare
- Home sempre visibile (opacity ridotta quando lontano)
- Colori: oro (home), rosa (wishlist), bianco (trips)

#### Archi Animati (Travel Lines)
- Archi Home→Trip: gradiente oro→rosso
- Archi Itinerario: gradiente arancione
- Dash length 0.5, gap 0.1, animate time 2000ms, stroke 0.8

#### Particelle Flottanti (Custom Layer)
- 2 particelle rosse per viaggio
- 1 particella rosa per wishlist
- Offset random ±1.5° lat/lng
- Opacity: trips 0.3-0.6, wishlist 0.2-0.4

#### Controlli Camera
```javascript
autoRotate: true
autoRotateSpeed: 0.4           // rallenta con zoom
enableDamping: true
dampingFactor: 0.12            // smorzamento rotazione
rotateSpeed: 0.8
zoomSpeed: 1.0
minDistance: 110                // zoom massimo avvicinamento
maxDistance: 600                // zoom massimo allontanamento
enablePan: false               // no trascinamento
```

**Auto-rotazione intelligente:** Si ferma al tocco, riprende dopo 7 secondi di inattività.

#### Zoom Adattivo (aggiornamenti ogni 100ms)
```javascript
// Calcolo fattore zoom
zoomFactor = max(0.2, min(1.5, (cameraDistance - 100) / 260))

// Aggiorna solo se cambio significativo
if (|newFactor - oldFactor| > 0.03 || altitudeChanged > 0.05) {
  renderPins();  // ricalcola dimensioni pin, label opacity, ring size
}
```

#### spreadPins() - Offset Pin Sovrapposti
```javascript
// Per pin a coordinate IDENTICHE: offset circolare fisso 0.3°
// Per pin molto vicini (< 0.5°): nudge di 0.15°
// NON dipende dallo zoom - offset fisso una tantum
```

#### Flythrough (Animazione Itinerario)
- Sequenza di stop con camera che vola da uno all'altro
- Prima fermata: altitude 2.5, durata 2000ms
- Fermate successive: altitude 1.8, durata 2500ms
- Pausa 800ms tra fermate
- Disattiva auto-rotazione durante il volo

#### Comunicazione WebView ↔ React Native

**Da React Native alla WebView (postMessage JSON):**
```json
{"type": "updateTrips", "trips": [...]}
{"type": "updateHome", "home": {"latitude": 41.9, "longitude": 12.5, "name": "Roma"}}
{"type": "flyTo", "lat": 35.7, "lng": 139.7}
{"type": "updateTravelLines", "show": true}
{"type": "updateVisitedCountries", "countries": ["IT", "FR", "ES"]}
{"type": "flythrough", "stops": [{"lat": 41.9, "lng": 12.5}, {"lat": 48.8, "lng": 2.3}]}
{"type": "cleanup"}
```

**Dalla WebView a React Native (postMessage JSON):**
```json
{"type": "ready"}
{"type": "pinClick", "tripId": "1234567890"}
{"type": "log", "message": "debug info"}
{"type": "flythroughDone"}
```

---

### src/components/TripForm.tsx (~500 righe) - Form Viaggio

Modale per creare o modificare un viaggio.

**Modalità:** Crea (editTrip = null) o Modifica (editTrip fornito)

**Stato interno:**
- `locationQuery` - testo ricerca luogo
- `foundLocation` - lat/lon trovate dal geocoding
- `title, date, notes` - campi testo
- `media: MediaItem[]` - galleria foto/video
- `selectedTags: TripTag[]` - tag selezionati
- `foundCountry, foundCountryCode` - paese dal reverse geocode
- `selectedItineraryId` - itinerario di appartenenza
- `showArc, isWishlist` - toggle switches

**Pipeline Geocoding (3 provider in cascata):**
1. **Nominatim (OSM)** + **Photon (Komoot)** in parallelo (no permessi richiesti)
2. Fallback: **expo-location** geocoder nativo (chiede permesso posizione)
3. Il primo risultato valido vince → setta lat/lon + nome paese

**Gestione Media:**
1. Utente sceglie Camera o Gallery (expo-image-picker)
2. Se immagine: compressione con expo-image-manipulator (resize + quality)
3. Copia file in `documentDirectory/media/` con nome unico
4. Salva MediaItem con uri locale, tipo, dimensioni

**Date Picker Custom:** Selettori separati per mese/giorno/anno, formato output YYYY-MM-DD

**Validazione:** Titolo obbligatorio, Posizione obbligatoria (deve essere geocodificata con successo)

**Salvataggio:** Chiama `onSave(tripData)` → il parent (App.tsx) genera ID + createdAt, aggiunge allo stato, salva su storage

---

### src/components/MemoryViewer.tsx (~250 righe) - Galleria Media

Visualizzatore fullscreen per foto e video di un viaggio.

**Layout:**
- Header: titolo viaggio, luogo, data, note, pulsanti azione
- Area principale: FlatList orizzontale di immagini/video (90% larghezza schermo)
- Thumbnails: strip in basso con miniature cliccabili
- Contatore: "X / Y" in alto a destra

**Funzionalità:**
- Player video con expo-av e controlli nativi
- Swipe tra elementi
- Tap thumbnail per saltare all'indice
- Pulsante Condividi (React Native Share)
- Pulsante Modifica (apre TripForm)
- Pulsante Elimina (con conferma)

---

### src/components/TripSidebar.tsx (~400 righe) - Sidebar Viaggi

Pannello laterale animato che elenca tutti i viaggi.

**Funzionalità:**
- **Ricerca:** Filtra per titolo/luogo/paese
- **Ordinamento:** paese (default), recente, data, nome, preferiti
- **Filtro tag:** opzionale, per categoria
- **Sezioni collassabili:** raggruppa viaggi per paese (con bandiera emoji)
- **Card viaggio:** titolo, luogo, data, tag colorati, conteggio media, toggle preferito

**Animazione:** Slide-in da sinistra con spring (tensione 65, frizione 11), backdrop semi-trasparente

---

### src/components/SettingsScreen.tsx (~400 righe) - Impostazioni

**Sezioni:**

1. **Lingua:** Griglia di 8 lingue con codici (IT, EN, ES, FR, DE, PT, ZH, JA)
2. **Posizione Casa:** Cerca tramite Nominatim + imposta, mostra con bandiera, pulsante rimuovi
3. **Sicurezza:** Toggle blocco biometrico (verifica capability dispositivo, richiede test auth prima di abilitare)
4. **Gestione Dati:**
   - Export: serializza trips in JSON → condividi via share sheet nativo
   - Import: seleziona file JSON → parse → conferma → merge nell'array trips
   - Elimina tutto: clearAll() da StorageService (con warning)
   - Backup cloud: salva in cartella backups del dispositivo
5. **Info:** Versione app, pulsante per rivedere onboarding
6. **Legale:** Link a Privacy Policy e Terms of Service (aprono modali)

---

### src/components/StatsScreen.tsx (~157 righe) - Statistiche

Dashboard con metriche di viaggio:
- Numeri grandi: totale viaggi, foto, paesi visitati
- Dettagli: video, preferiti
- Range date: primo viaggio → ultimo viaggio
- Istogramma mensile: barre per tutti i 12 mesi (altezza = conteggio viaggi)

---

### src/components/CalendarView.tsx (~191 righe) - Calendario

- Navigazione mese/anno (frecce prev/next)
- Griglia calendario (Lunedì-Domenica)
- Giorni con viaggi evidenziati con indicatore punto
- Oggi evidenziato in cyan
- Tap su giorno → seleziona primo viaggio di quel giorno
- Sotto il calendario: lista viaggi del mese corrente con card

---

### src/components/ItineraryManager.tsx (~250 righe) - Gestore Itinerari

- Sezione creazione: input testo + pulsante crea
- Lista itinerari: nome, conteggio viaggi, lista viaggi collegati con linea a punti
- Azioni per itinerario:
  - Play (flythrough): animazione camera attraverso tutti i viaggi
  - Rinomina: input inline
  - Elimina: conferma, orfana i viaggi (rimuove itineraryId)

---

### src/components/OnboardingScreen.tsx (~200 righe) - Tutorial

**Schermo 1:** Selezione lingua
- Scroll orizzontale con card eleganti
- Bandiere emoji reali (🇮🇹 🇬🇧 🇪🇸 🇫🇷 🇩🇪 🇧🇷 🇨🇳 🇯🇵)
- Tap per selezionare e procedere

**Schermo 2:** Carousel 3 slide
- Slide 1: "Esplora il mondo" (icona globo, colore cyan)
- Slide 2: "Salva i ricordi" (icona camera, colore blu)
- Slide 3: "Rivivi le avventure" (icona stats, colore viola)
- Navigazione: dots, skip, next/start

---

### src/components/GDPRConsent.tsx (~125 righe) - Consenso Privacy

Gate obbligatorio prima di usare l'app:
- Titolo: "La Tua Privacy"
- Testo: l'app salva dati localmente, nessun cloud, nessuna condivisione
- 3 punti con checkmark verdi
- Pulsante "Accetta" (azione principale)
- Link "Scopri di più" → apre PrivacyPolicy

---

### src/components/PrivacyPolicy.tsx (~94 righe) - Privacy Policy

Testo completo bilingue (IT/EN) con 5 sezioni:
1. Raccolta Dati (NON raccoglie dati personali)
2. Dati Salvati Localmente (viaggi, GPS, foto, preferenze)
3. Servizi Esterni (solo OpenStreetMap Nominatim per geocoding)
4. I Tuoi Diritti (elimina viaggi, disinstalla)
5. Contatti (email)

---

### src/components/TermsOfService.tsx (~94 righe) - Termini di Servizio

Testo completo bilingue (IT/EN) con 5 sezioni:
1. Accettazione
2. Uso dell'App (app personale, utente responsabile dei contenuti)
3. Dati e Backup (dati locali, consigliato backup via export)
4. Proprietà Intellettuale
5. Modifiche

---

### src/components/SaveConfirmation.tsx (~69 righe) - Toast

Notifica breve animata:
- Appare al centro schermo
- Icona checkmark verde (personalizzabile)
- Messaggio custom
- Auto-nasconde dopo 1.2 secondi
- Animazione spring scale in, fade out

---

### src/components/OfflineBanner.tsx (~52 righe) - Banner Offline

Indicatore stato rete:
- Mostra quando offline (isConnected = false)
- Posizionato top-left
- Icona warning ambra
- Testo: "Sei offline" + "Il globo necessita di internet per caricarsi"
- Usa @react-native-community/netinfo

---

### src/components/ErrorBoundary.tsx (~139 righe) - Error Boundary

Cattura errori non gestiti nei componenti React:
- Class component con getDerivedStateFromError + componentDidCatch
- Mostra UI errore con icona, titolo, sottotitolo
- In dev: mostra messaggio errore + component stack
- Pulsante restart (expo-updates.reloadAsync)

---

### src/i18n/translations.ts (~500 righe) - Traduzioni

150+ chiavi tradotte in 8 lingue.

```typescript
type Language = 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';

// Esempi di chiavi:
appName, addTrip, editTrip, deleteTrip, settings, statistics,
calendar, itineraries, search, sort, filter, save, cancel,
tripTitle, tripLocation, tripDate, tripNotes, tripTags,
onboardingTitle1/2/3, onboardingText1/2/3, onboardingStart,
privacyPolicy, termsOfService, language, biometricLock,
exportData, importData, deleteAllData, ...
```

---

### src/utils/geocoding.ts (~62 righe) - Geocoding

```typescript
// Ricerca luogo → coordinate
geocodeWithNominatim(query: string, language: string): Promise<GeocodingResult[]>
// API: https://nominatim.openstreetmap.org/search
// Ritorna: { lat, lon, display_name, address: { country, country_code } }

// Coordinate → nome paese
reverseGeocodeCountry(lat: number, lon: number): Promise<{ country, countryCode }>

// Parse nome paese dall'ultima parte dopo la virgola
extractCountryFromLocationName(locationName: string): string

// Fetch con timeout 10 secondi
fetchWithTimeout(url: string, options: object, timeout: number): Promise<Response>
```

---

### src/utils/countryFlags.ts (~21 righe) - Bandiere Emoji

```typescript
isoToFlag("IT") → "🇮🇹"
// Logica: Unicode code points 127397 + charCode di ogni lettera

getCountryFlag(countryCode?: string) → flag emoji o "🌍" come fallback
```

---

## FLUSSI DI DATI

### Avvio App
```
Launch app
  → App.tsx monta ErrorBoundary + AppProvider
  → AppProvider carica settings da AsyncStorage (useEffect)
  → AppContent verifica isSettingsLoaded (spinner se no)
  → Carica trips + itineraries da StorageService (useEffect)
  → Se biometricEnabled → prompt autenticazione biometrica
  → Se !hasSeenOnboarding → mostra OnboardingScreen
  → Se !hasAcceptedGDPR → mostra GDPRConsent
  → Render UI principale: Globo + Header + Sidebar + Pulsanti
```

### Salvataggio Viaggio
```
Utente compila TripForm → preme Salva
  → TripForm chiama onSave(tripData)
  → App.tsx handleSaveTrip():
    → Se nuovo: genera id = Date.now().toString(), createdAt = new Date().toISOString()
    → Se modifica: aggiorna trip esistente nell'array
    → setTrips([...]) aggiorna stato React
    → Se itineraryId: aggiorna itinerary.tripIds
  → useEffect rileva cambio trips → StorageService.saveTrips(trips)
  → Mostra SaveConfirmation toast
  → Fly globo alla posizione del viaggio salvato
```

### Comunicazione col Globo
```
trips o settings cambiano
  → useEffect in componente EarthGlobe
  → webViewRef.postMessage(JSON.stringify({type:'updateTrips', trips: mappedTrips}))
  → WebView riceve messaggio in onMsg()
  → handleCmd() smista per tipo
  → Per 'updateTrips': _trips = d.trips → renderPins()
  → renderPins() costruisce 3 array: points, rings, labels
  → globe.pointsData(dp).ringsData(dr).labelsData(dl)
  → Globe.gl re-renderizza i pin
```

### Click su Pin
```
Utente tocca un pin sul globo
  → globe.gl chiama onPin(point)
  → onPin() manda postMessage({type:'pinClick', tripId: p.tripId})
  → React Native onMessage handler riceve il messaggio
  → EarthGlobe chiama onPinClick(tripId)
  → App.tsx trova il trip, apre MemoryViewer o TripSidebar
```

---

## STORAGE A DUE LIVELLI

### Livello 1: Metadati (AsyncStorage)
- `@travelsphere_trips` → JSON array di Trip
- `@travelsphere_itineraries` → JSON array di Itinerary
- `@travelsphere_settings` → JSON oggetto AppSettings

### Livello 2: Media (expo-file-system)
- Directory: `FileSystem.documentDirectory/media/`
- File: JPEG/PNG compressi + MP4 video
- Riferiti tramite URI completo in Trip.media[].uri

### Caricamento
1. Carica JSON da AsyncStorage
2. Su piattaforma nativa: verifica che tutti i file media esistano ancora
3. Rimuove riferimenti a file mancanti (cleanup)

### Salvataggio
- Auto-save via useEffect ogni volta che trips o itineraries cambiano
- Scatta solo dopo il caricamento iniziale (previene sovrascrittura con array vuoto)

---

## SCHEMA COLORI (Tema Scuro)

| Elemento | Colore | Hex |
|----------|--------|-----|
| Background | Quasi nero | `#050510` |
| Accent primario | Cyan luminoso | `#00d4ff` |
| Accent secondario | Blu chiaro | `#60A5FA` |
| Viola | Accent terziario | `#8B5CF6` |
| Distruttivo | Rosso | `#EF4444` |
| Successo | Verde | `#10B981` |
| Warning | Ambra | `#F59E0B` |
| Testo primario | Quasi bianco | `#F0F0F0` |
| Testo secondario | Grigio chiaro | `#D1D5DB` |
| Testo terziario | Grigio | `#9CA3AF` |
| Testo muted | Grigio scuro | `#6B7280` |
| Card background | Semi-trasparente | `rgba(15,15,20,0.95)` |
| Overlay | Nero semi-trasparente | `rgba(0,0,0,0.7)` |
| Pin Home | Oro | `#FFD700` |
| Pin Trip | Rosso | `#EF4444` |
| Pin Wishlist | Rosa | `#EC4899` |

---

## FUNZIONALITÀ CHIAVE SPIEGATE

### 1. Fog of War
Ogni viaggio non-wishlist con countryCode popola il set `visitedCountries` in App.tsx. Questo set viene passato a EarthGlobe che lo invia alla WebView. Nel globo, i paesi nel set sono renderizzati con esagoni cyan luminosi e bordi brillanti. I paesi non visitati sono scuri e tenues. Effetto: "scopri il mondo" man mano che viaggi.

### 2. Itinerari
Raggruppano viaggi sotto un nome. Ogni Trip ha un campo opzionale `itineraryId`. L'Itinerary tiene un array `tripIds`. Il pulsante "Play" nell'ItineraryManager attiva una flythrough animation: la camera vola sequenzialmente a ogni viaggio dell'itinerario. Gli archi animati collegano i viaggi dello stesso itinerario sul globo.

### 3. Sicurezza Biometrica
Opzionale. Usa expo-local-authentication per fingerprint/Face ID. Prompt all'apertura app e al ritorno da background (AppState listener). Prima di abilitare, testa se il dispositivo supporta biometria e fa un test di autenticazione.

### 4. Geocoding a Catena
Per massimizzare affidabilità con API gratuite rate-limited:
1. Nominatim (OSM) + Photon (Komoot) in parallelo → nessun permesso richiesto
2. Se entrambi falliscono: expo-location geocoder nativo → chiede permesso posizione
3. Primo risultato valido vince

### 5. Export/Import
- **Export:** Serializza array trips in JSON → salva in cache FileSystem → condividi via share sheet nativo
- **Import:** Seleziona file JSON tramite document picker → parse → mostra conferma con conteggio → merge nell'array trips esistente

### 6. Wishlist
Trip con `isWishlist: true`. Pin rosa sul globo. Non contribuiscono al Fog of War (non sono stati visitati). Particelle flottanti rosa invece di rosse.

---

## DIPENDENZE PRINCIPALI

**Core:** react, react-native, react-dom, expo

**UI/Animazioni:**
- react-native-safe-area-context, react-native-gesture-handler
- react-native-reanimated (animazioni performanti)
- react-native-webview (globo)
- @expo/vector-icons (Ionicons)
- expo-blur

**Expo Modules:**
- expo-font, expo-status-bar, expo-updates
- expo-screen-orientation, expo-navigation-bar
- expo-image-picker, expo-image-manipulator
- expo-file-system, expo-sharing, expo-document-picker
- expo-location (geocoding), expo-local-authentication (biometria)
- expo-haptics (feedback tattile), expo-av (video), expo-asset

**Storage:** @react-native-async-storage/async-storage
**Network:** @react-native-community/netinfo

---

## CONFIGURAZIONE BUILD

**app.json:**
- Nome: "TravelSphere", Slug: "travelsphere"
- Orientamento: landscape
- Tema scuro
- SDK Expo 52, motore Hermes
- Android package: com.travelsphere.app, targetSdk 34
- Permessi: location, camera, biometric, media reading

**eas.json:**
- Development: distribuzione interna
- Production: Android AAB, auto-increment versione

---

## DECISIONI ARCHITETTURALI

1. **No React Navigation** → Architettura single-screen a modali. Stato semplice, no deep linking necessario
2. **WebView per Globo** → globe.gl è una libreria JS/WebGL. Usare WebView evita la complessità di un bridge Three.js nativo
3. **Storage solo locale** → GDPR-compliant by design, sempre funzionante offline, nessun costo server
4. **Catena geocoding** → API gratuite hanno rate-limit. Tre provider in cascata massimizzano affidabilità
5. **Orientamento landscape** → Il globo 3D ha bisogno di spazio orizzontale per essere utilizzabile
6. **Context API, non Redux** → Sufficiente per un'app diario di viaggio senza flussi async complessi
7. **Tema scuro** → Riduce affaticamento visivo, fa risaltare gli accent luminosi (cyan, oro)
