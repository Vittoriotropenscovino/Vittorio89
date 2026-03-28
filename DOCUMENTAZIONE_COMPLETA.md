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
- Acquisti in-app: RevenueCat (react-native-purchases)
- ID Generation: expo-crypto (UUID v4)
- Testing: Jest + ts-jest
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
                │   ├── HelpGuide (guida in-app)
                │   ├── PaywallScreen (acquisto premium)
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
│   ├── components/ (18 file)
│   │   ├── EarthGlobe.tsx        (integrazione globe.gl, ~323 righe - vendor bundling + timeout)
│   │   ├── TripForm.tsx          (crea/modifica viaggi, ~747 righe, check offline)
│   │   ├── MemoryViewer.tsx      (galleria media, ~271 righe, FlatList windowing)
│   │   ├── TripSidebar.tsx       (sidebar lista viaggi, ~360 righe)
│   │   ├── SettingsScreen.tsx    (modale impostazioni, ~627 righe, storage monitor)
│   │   ├── StatsScreen.tsx       (statistiche viaggio, ~158 righe)
│   │   ├── CalendarView.tsx      (browser calendario, ~191 righe)
│   │   ├── ItineraryManager.tsx  (UI itinerari, ~287 righe)
│   │   ├── OnboardingScreen.tsx  (tutorial primo avvio, ~304 righe)
│   │   ├── GDPRConsent.tsx       (gate consenso privacy, ~125 righe)
│   │   ├── PrivacyPolicy.tsx     (testo legale privacy, ~76 righe)
│   │   ├── TermsOfService.tsx    (testo legale termini, ~94 righe)
│   │   ├── HelpGuide.tsx         (guida in-app, ~92 righe, 8 sezioni tradotte)
│   │   ├── PaywallScreen.tsx     (paywall freemium, ~248 righe, acquisto/restore)
│   │   ├── SaveConfirmation.tsx  (toast notifica, ~68 righe)
│   │   ├── OfflineBanner.tsx     (stato rete, ~51 righe)
│   │   ├── ErrorBoundary.tsx     (recovery errori, ~138 righe)
│   │   └── index.ts              (barrel export)
│   ├── contexts/
│   │   └── AppContext.tsx         (settings globali + lingua, ~108 righe)
│   ├── hooks/
│   │   ├── useTrips.ts           (hook gestione trips + itinerari, ~168 righe)
│   │   ├── useModals.ts          (hook gestione stato modali, ~61 righe)
│   │   ├── useAuth.ts            (hook autenticazione biometrica, ~63 righe)
│   │   ├── useFogOfWar.ts        (hook calcolo paesi visitati, ~14 righe)
│   │   ├── usePurchase.ts        (hook gestione acquisti freemium, ~65 righe)
│   │   ├── index.ts              (barrel export hooks)
│   │   └── __tests__/
│   │       └── useTrips.test.ts  (test useTrips hook, ~309 righe)
│   ├── services/
│   │   ├── StorageService.ts     (AsyncStorage + FileSystem + backup + migration, ~454 righe)
│   │   ├── PurchaseService.ts    (RevenueCat wrapper, acquisti in-app, ~85 righe)
│   │   └── __tests__/
│   │       └── StorageService.test.ts  (test StorageService, ~541 righe)
│   ├── types/
│   │   └── index.ts              (interfacce TypeScript)
│   ├── i18n/
│   │   └── translations.ts       (8 lingue, ~126 chiavi, ~2183 righe)
│   └── utils/
│       ├── geocoding.ts           (Nominatim + fallback, ~61 righe)
│       ├── countryFlags.ts        (conversione emoji bandiere, ~21 righe)
│       ├── validateTrip.ts        (validazione + sanitizzazione import, ~154 righe)
│       └── __tests__/
│           └── geocoding.test.ts  (test geocoding, ~110 righe)
├── assets/
│   ├── globe.html                (HTML/JS globo 3D, ~697 righe - vendor injection + clustering + collision)
│   └── vendor/
│       ├── topojson-client.min.txt  (topojson-client v3.1.0, 7.2 KB)
│       ├── globe.gl.min.txt         (globe.gl v2.45.1, 1.76 MB)
│       └── countries-110m.txt       (world atlas TopoJSON, 107.7 KB)
├── App.tsx                        (entry point principale, ~473 righe - logica estratta in hooks)
├── app.json                       (config Expo)
├── tsconfig.json
├── babel.config.js
├── metro.config.js
├── eas.json                       (config build EAS)
└── package.json                   (dipendenze + configurazione Jest inline con ts-jest)
```

---

## FILE PRINCIPALI - DETTAGLIO

### App.tsx (~473 righe) - Shell Principale

Orchestratore dell'app. Tutta la logica è stata estratta in hook dedicati: `useTrips`, `useModals`, `useAuth`, `useFogOfWar`.

**Stato delegato a hook estratti:**
- `useTrips(t)` → `trips`, `itineraries`, `isLoading`, `saveTrip`, `deleteTrip`, `toggleFavorite`, `createItinerary`, `deleteItinerary`, `renameItinerary`
- `useModals()` → `activeModal`, `selectedTrip`, `sidebarOpen`, `editingTrip`, `showSaveConfirm`, `saveMsg` + funzioni di gestione
- `useAuth(biometricEnabled, isSettingsLoaded, t)` → `authenticated`
- `useFogOfWar(trips)` → `visitedCountries` (array codici paese)
- `usePurchase()` → `isPremium`, `price`, `purchase`, `restore`, `canAddTrip`, `remainingFreeTrips`, `FREE_TRIP_LIMIT`

**Logica di avvio:**
1. Carica fonts con expo-font
2. AppProvider carica settings da AsyncStorage
3. AppContent verifica isSettingsLoaded
4. useTrips: `migrateData()` → carica trips + itineraries → auto-backup + orphaned media cleanup
5. usePurchase: inizializza RevenueCat, verifica stato premium, carica prezzo
6. useAuth: Se biometricEnabled → prompt autenticazione biometrica
7. Se !hasSeenOnboarding → mostra OnboardingScreen
8. Se !hasAcceptedGDPR → mostra GDPRConsent
9. Mostra UI principale (Globo + Overlay)

**Nasconde barra Android:** Usa expo-navigation-bar per nascondere la barra di navigazione

---

### src/hooks/useTrips.ts (~168 righe) - Hook Gestione Dati

Custom hook che gestisce tutto il CRUD di trips e itinerari, estratto da App.tsx.

**ID Generation:** Usa `Crypto.randomUUID()` da expo-crypto (UUID v4) invece di `Date.now()`

**Auto-save con debounce (800ms):**
- Costante `SAVE_DEBOUNCE_MS = 800` - ritardo prima del salvataggio effettivo
- Quando trips/itineraries cambiano → timer 800ms → `StorageService.saveAll()` (atomic multiSet)
- Se il salvataggio fallisce: retry automatico dopo 2 secondi
- Se anche il retry fallisce: mostra Alert all'utente ("Salvataggio fallito")

**Background flush:**
- Listener su AppState (inactive/background)
- Quando l'app va in background → flush immediato di qualsiasi save pendente (cancella debounce)

**Inizializzazione:**
1. Chiama `StorageService.migrateData()` (schema v0 → v1)
2. Carica trips + itineraries in parallelo
3. Esegue auto-backup (`checkAndPerformAutoBackup()`) in background
4. Avvia pulizia media orfani (`checkAndCleanOrphanedMedia()`) in background

**Funzioni esportate (tutte useCallback):**
- `saveTrip(tripData, editingTrip)` - crea (UUID + createdAt) o aggiorna viaggio, gestisce itinerario
- `deleteTrip(tripId)` - rimuove dallo stato e dal disco
- `toggleFavorite(tripId)` - marca/smarca preferito
- `createItinerary(name)` - crea itinerario con UUID
- `deleteItinerary(id)` - rimuove itinerario, orfana viaggi
- `renameItinerary(id, newName)` - aggiorna nome

---

### src/hooks/useModals.ts (~61 righe) - Hook Gestione Modali

Centralizza tutto lo stato e la logica dei modali, estratto da App.tsx.

**Tipo:** `ModalType = 'none' | 'form' | 'settings' | 'privacy' | 'terms' | 'stats' | 'calendar' | 'itineraryManager' | 'helpGuide' | 'paywall'`

**Stato gestito:**
- `activeModal` - modale attualmente visibile
- `selectedTrip` - viaggio selezionato per il viewer
- `sidebarOpen` - visibilità sidebar
- `editingTrip` - viaggio in modifica
- `showSaveConfirm` - visibilità toast salvataggio
- `saveMsg` - messaggio di conferma

**Funzioni (tutte useCallback):**
- `openModal(modal)`, `closeModal()`, `selectTrip(trip)`, `startEditTrip(trip)`, `closeForm()`, `showSaveToast(message)`, `hideSaveToast()`

---

### src/hooks/useAuth.ts (~63 righe) - Hook Autenticazione Biometrica

Gestisce l'autenticazione biometrica con lifecycle AppState.

**Parametri:** `useAuth(biometricEnabled, isSettingsLoaded, t)`

**Comportamento:**
- All'avvio: esegue autenticazione biometrica se abilitata e settings caricati
- Al ritorno da background: ri-autentica (listener AppState inactive/background → active)
- Usa `expo-local-authentication` per l'API biometrica

**Ritorna:** `{ authenticated: boolean }`

---

### src/hooks/useFogOfWar.ts (~14 righe) - Hook Fog of War

Calcola il set di paesi visitati dai viaggi.

**Parametri:** `useFogOfWar(trips)`

**Logica:** Raccoglie tutti i `countryCode` dai viaggi non-wishlist, memoizzato con `useMemo`.

**Ritorna:** `string[]` di codici paese ISO

---

### src/hooks/usePurchase.ts (~65 righe) - Hook Acquisti Freemium

Hook che gestisce il sistema freemium tramite RevenueCat.

**Costante:** `FREE_TRIP_LIMIT = 3` — numero massimo di viaggi gratuiti (solo non-wishlist)

**Stato interno:**
- `isPremium` — boolean, true se utente ha acquistato premium (true in `__DEV__`)
- `isLoading` — boolean, fase di inizializzazione
- `price` — string, prezzo formattato da RevenueCat (default `€3,49`)

**Inizializzazione (useEffect):**
1. `PurchaseService.initialize()` — configura RevenueCat SDK
2. `PurchaseService.isPremium()` — verifica stato premium
3. `PurchaseService.getOfferings()` — carica prezzo reale dal catalogo

**Funzioni esportate (tutte useCallback):**
- `purchase()` → chiama PurchaseService.purchase(), setta isPremium se successo
- `restore()` → chiama PurchaseService.restorePurchases(), setta isPremium se successo
- `canAddTrip(currentTripCount)` → true se premium o sotto il limite (sempre true in `__DEV__`)
- `remainingFreeTrips(currentTripCount)` → numero trip gratuiti rimanenti (Infinity se premium)

---

### src/services/PurchaseService.ts (~85 righe) - Servizio Acquisti

Wrapper statico per RevenueCat SDK (react-native-purchases).

**Configurazione:**
```typescript
REVENUECAT_ANDROID_KEY = 'YOUR_ANDROID_KEY'  // placeholder
REVENUECAT_IOS_KEY = 'YOUR_IOS_KEY'          // placeholder
ENTITLEMENT_ID = 'premium'
```

**Metodi statici:**
```typescript
initialize(): Promise<void>           // Configura RevenueCat con API key per piattaforma
isPremium(): Promise<boolean>          // Verifica entitlement 'premium' (true in __DEV__)
getOfferings(): Promise<PurchasesPackage | null>  // Carica primo pacchetto disponibile
purchase(): Promise<boolean>           // Acquista pacchetto, gestisce cancellazione utente
restorePurchases(): Promise<boolean>   // Ripristina acquisti precedenti
```

**Error handling:** Catch con type guard per `userCancelled` (no `any`). Tutti i log con prefix `[TravelSphere]`.

---

### src/components/PaywallScreen.tsx (~248 righe) - Paywall Freemium

Modale per l'acquisto della versione premium, mostrata quando l'utente supera il limite di 3 viaggi gratuiti.

**Props:**
```typescript
interface Props {
  visible: boolean;
  onClose: () => void;
  price: string;
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  freeLimit: number;
}
```

**Stato interno:** `purchasing`, `restoring`, `success` — gestione UI durante le operazioni async

**Layout:**
- Icona globo cyan
- Titolo: "Sblocca Viaggi Illimitati"
- Sottotitolo: "Hai raggiunto il limite di {freeLimit} viaggi gratuiti"
- 4 feature con checkmark verde (viaggi illimitati, acquisto una tantum, no abbonamento, supporto sviluppatore indie)
- Pulsante acquisto cyan con prezzo dinamico
- Link "Già acquistato? Ripristina acquisto"
- Success state: checkmark verde + messaggio, auto-chiude dopo 1.5s

---

### src/components/HelpGuide.tsx (~92 righe) - Guida In-App

Modale con 8 sezioni di aiuto, accessibile da sidebar e Settings. Completamente tradotta in 8 lingue.

**8 Sezioni:**
1. **Aggiungere un Viaggio** (icona: add-circle)
2. **Il Globo Interattivo** (icona: globe)
3. **Fog of War** (icona: eye)
4. **Itinerari e Flythrough** (icona: git-merge)
5. **Linee di Viaggio** (icona: airplane)
6. **Backup e Sicurezza** (icona: shield-checkmark)
7. **Wishlist** (icona: heart)
8. **Statistiche e Calendario** (icona: stats-chart)

**Layout:** ScrollView con sezioni separate da bordi, ogni sezione ha icona in box cyan + titolo + testo descrittivo.

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
  id: string;              // UUID v4 (generato da expo-crypto)
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
- `t(key: TranslationKey)` → `string` tradotta nella lingua corrente
- `setLanguage(lang)` → cambia lingua e persiste
- `language` → lingua corrente
- `settings` → oggetto AppSettings completo
- `updateSettings(partial)` → aggiorna e persiste parzialmente

---

### src/services/StorageService.ts (~454 righe) - Servizio Storage

Astrazione unificata per AsyncStorage (metadati) + expo-file-system (media) + auto-backup + migrazione schema + validazione checksum + pulizia media orfani.

**Costanti:**
```typescript
BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000  // 7 giorni
CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000  // 7 giorni
MAX_BACKUPS = 3
CURRENT_SCHEMA_VERSION = 1
```

**Metodi CRUD base:**
```typescript
saveTrips(trips: Trip[]): Promise<void>
loadTrips(): Promise<Trip[]>        // su native verifica esistenza file media
deleteTrip(tripId, trips): Promise<Trip[]>  // rimuove + cancella media dal disco
saveItineraries(itineraries): Promise<void>
loadItineraries(): Promise<Itinerary[]>
clearAll(): Promise<void>           // cancella TUTTO: AsyncStorage + directory media
```

**Salvataggio atomico (NUOVO):**
```typescript
saveAll(trips, itineraries): Promise<void>
// Usa AsyncStorage.multiSet() per salvare trips + itineraries atomicamente
// Garantisce consistenza tra le due strutture dati
```

**Schema Versioning & Migrazione (NUOVO):**
```typescript
migrateData(): Promise<void>
// Controlla versione schema salvata vs CURRENT_SCHEMA_VERSION (v1)
// v0 → v1: aggiunge campi default (tags:[], isFavorite:false, isWishlist:false, media:[], notes:'')
// Preserva campi esistenti, riempie solo quelli mancanti
// Idempotente: sicuro chiamare più volte

loadTripsRaw(): Promise<any[]>       // carica senza verifica media (per migrazione)
loadItinerariesRaw(): Promise<any[]>  // carica senza type casting (per migrazione)
```

**Auto-backup con SHA-256 (MIGLIORATO):**
```typescript
checkAndPerformAutoBackup(): Promise<boolean>
// Crea backup con: data + checksum SHA-256 + schemaVersion + createdAt
// Verifica file scritto rileggendo e ri-calcolando hash
// Rileva corruzione tramite mismatch checksum
// Ruota vecchi backup (mantiene MAX_BACKUPS=3) SOLO dopo verifica
// Ritorna boolean successo

validateBackup(content): { valid, data, hasChecksum }
// Formato NUOVO: { schemaVersion, checksum, createdAt, data: { trips, itineraries } }
// Formato LEGACY: { trips, exportDate, version } (senza checksum)
// Valida checksum se presente
```

**Pulizia Media Orfani (NUOVO):**
```typescript
cleanOrphanedMedia(): Promise<{ deletedCount, freedBytes }>
// Scansiona directory media e trips
// Identifica file non referenziati da nessun trip
// Elimina file orfani, traccia conteggio + byte liberati
// Solo native (skip su web)

checkAndCleanOrphanedMedia(): Promise<void>
// Scheduler non-bloccante: esegue solo se 7+ giorni dall'ultima pulizia
// Pensato per esecuzione in background senza await
```

**Monitor Storage (NUOVO):**
```typescript
getStorageInfo(): Promise<StorageInfo>
// Calcola metriche storage per UI:
//   tripCount, mediaCount, mediaSize, metadataSize
//   backupCount, backupSize, totalSize
// Scansiona directory media e backup per dimensioni file (solo native)
```

**Platform awareness:** `isWeb = Platform.OS === 'web'` — operazioni media/backup/cleanup saltate su web

**Directory media:** `FileSystem.documentDirectory + 'media/'`
**Directory backup:** `FileSystem.documentDirectory + 'backups/'`

---

### src/components/EarthGlobe.tsx (~323 righe) - Globo 3D

Componente React che wrappa una WebView con globe.gl. Librerie vendor bundlate localmente per supporto offline.

**Vendor Bundling (NUOVO):**
```typescript
const globeHtmlModule = require('../../assets/globe.html');
const topojsonModule = require('../../assets/vendor/topojson-client.min.txt');
const globeGlModule = require('../../assets/vendor/globe.gl.min.txt');
const countriesModule = require('../../assets/vendor/countries-110m.txt');
```
- Carica tutti gli asset vendor in parallelo con `loadAssetString()`
- Inietta script vendor inline nell'HTML tramite placeholder `// <!--VENDOR_SCRIPTS_PLACEHOLDER-->`
- Cache del risultato in `globeHtmlCache` per riutilizzo
- Fallback CDN (`unpkg.com`, `cdn.jsdelivr.net`) se i file locali falliscono

**Timeout WebView con Error Overlay (NUOVO):**
```typescript
READY_TIMEOUT_MS = 15000  // 15 secondi timeout
```
- Timer 15s all'avvio: se la WebView non segnala `ready`, mostra errore
- Overlay semi-trasparente con icona globo, messaggio errore, pulsante "Riprova"
- `retryLoad()`: resetta stato, ricarica WebView, reimmposta timeout

**Struttura del file:**
- Imports, costanti, funzioni di caricamento asset
- Componente React con WebView + timeout + error overlay
- useEffect per comunicazione RN→WebView (trips, home, settings)
- Handler onMessage per comunicazione WebView→RN (pinClick, ready)

**Il file `assets/globe.html` (~697 righe) contiene:**

#### Sfondo Stelle (canvas separato)
- 250 stelle con posizioni random
- Effetto tremolio (flicker) con seno + fase random
- Disegnate su canvas 2D sotto il globo

#### Librerie Vendor (bundlate localmente, fallback CDN)
- topojson-client v3.1.0 (per parsare dati mappa) - bundlato in `assets/vendor/topojson-client.min.txt`
- globe.gl v2.45.1 (libreria globo 3D basata su Three.js) - bundlato in `assets/vendor/globe.gl.min.txt`
- world-atlas countries-110m (dati geometria paesi) - bundlato in `assets/vendor/countries-110m.txt`
- Placeholder `// <!--VENDOR_SCRIPTS_PLACEHOLDER-->` iniettato inline da EarthGlobe.tsx
- Fallback: se i vendor bundlati non sono disponibili, carica da CDN (unpkg.com, cdn.jsdelivr.net)

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

#### Fog of War (Bordi Paesi)

I paesi visitati sono evidenziati tramite bordi poligonali luminosi (senza esagoni hex, per non coprire i pin).

```javascript
// Visitati - fill leggero + bordi luminosi
polygonCapColor: 'rgba(0,220,255,0.12)'    // fill cyan sottile
polygonSideColor: 'rgba(0,220,255,0.3)'     // bordi laterali visibili
polygonStrokeColor: 'rgba(0,230,255,0.8)'   // contorno luminoso

// Non visitati - quasi invisibili
polygonCapColor: 'rgba(0,0,0,0)'            // trasparente
polygonSideColor: 'rgba(0,200,255,0.05)'    // appena visibile
polygonStrokeColor: 'rgba(0,220,255,0.25)'  // contorno tenue

polygonAltitude: 0.009                       // leggera elevazione 3D
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
minDistance: 70                 // zoom massimo avvicinamento (ridotto da 110 per deep zoom)
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

#### Zoom-Adaptive Visuals (NUOVO)
Attivato sotto distanza camera 200. Funzione `updateZoomVisuals(dist)` modifica in tempo reale:
```javascript
// Fattore t = normalizzato tra 0 (zoom max, dist=70) e 1 (dist=200+)
t = max(0, min(1, (dist - 70) / 130))

// Poligoni paesi visitati: opacity stroke/cap/side diminuisce con zoom
visitedStrokeOp = 0.8*t + 0.15*(1-t)     // da 0.8 a 0.15
visitedCapOp    = 0.12*t + 0.02*(1-t)     // da 0.12 a 0.02

// Atmosfera: si restringe con zoom
atmosphereAltitude = 0.25*t + 0.08*(1-t)  // da 0.25 a 0.08

// Halo, griglia, scanner: sfumano con zoom
haloMesh.opacity = 0.1*t                  // sparisce a zoom massimo
gridLines.opacity = 0.09*t + 0.01*(1-t)
polygonAltitude = 0.009*t + 0.001*(1-t)   // quasi piatti a zoom max
```

#### Dynamic Pin Clustering (NUOVO)
Funzione `clusterPins(tripPins, trips)` raggruppa pin vicini sullo schermo:
```javascript
MIN_DIST = 35  // pixel soglia per clustering

// Algoritmo:
// 1. Proietta coordinate 3D → 2D schermo con projectToScreen()
// 2. Per ogni pin non ancora raggruppato:
//    - Se è il pin selezionato → sempre singolo (mai clusterizzato)
//    - Cerca pin entro MIN_DIST pixel → forma cluster
// 3. Cluster: media lat/lng, conteggio, colore rosso/rosa
// 4. Home mai clusterizzato

// Rendering cluster:
// - Pin più grande (scalato con clusterCount)
// - Label mostra il numero di pin raggruppati
// - Colore: rosso (#EF4444) per trip, rosa (#EC4899) se tutti wishlist
```

#### Label Collision Detection (NUOVO)
Previene sovrapposizione label dopo il clustering:
```javascript
// Bounding box: 120x20 pixel, scalato con exScale = max(1, 2.5 - altitude)
LABEL_W = 120, LABEL_H = 20

// Algoritmo:
// 1. Proietta tutte le label su schermo 2D
// 2. Ordina per priorità: pin selezionato (50) > home (100) > altri (0)
// 3. Accetta label se non sovrapposta a label già accettate
// 4. Label rifiutate marcate con _hidden:true → fadeout nel rendering
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

### src/components/TripForm.tsx (~747 righe) - Form Viaggio

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
0. **Check offline:** Verifica connessione con NetInfo. Se offline → Alert "Sei offline" e blocca la ricerca
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

### src/components/MemoryViewer.tsx (~271 righe) - Galleria Media

Visualizzatore fullscreen per foto e video di un viaggio, ottimizzato con FlatList windowing.

**Layout:**
- Header: titolo viaggio, luogo, data, note, pulsanti azione
- Area principale: FlatList orizzontale di immagini/video (90% larghezza schermo)
- Thumbnails: strip in basso con miniature cliccabili (FlatList separata)
- Contatore: "X / Y" in alto a destra

**Ottimizzazioni FlatList (NUOVO):**
- `windowSize={3}` - renderizza solo 3 schermi di contenuto
- `maxToRenderPerBatch={2}` - 2 elementi per batch di rendering
- `initialNumToRender={1}` - parte con 1 elemento
- `removeClippedSubviews={true}` - rimuove viste fuori schermo (risparmio memoria)
- `getItemLayout` - layout pre-calcolato per scrolling fluido per indice

**Funzionalità:**
- Player video con expo-av e controlli nativi
- Swipe tra elementi
- Tap thumbnail per saltare all'indice
- Pulsante Condividi (React Native Share)
- Pulsante Modifica (apre TripForm)
- Pulsante Elimina (con conferma)

---

### src/components/TripSidebar.tsx (~360 righe) - Sidebar Viaggi

Pannello laterale animato che elenca tutti i viaggi.

**Funzionalità:**
- **Ricerca:** Filtra per titolo/luogo/paese
- **Ordinamento:** paese (default), recente, data, nome, preferiti
- **Filtro tag:** opzionale, per categoria
- **Sezioni collassabili:** raggruppa viaggi per paese (con bandiera emoji)
- **Card viaggio:** titolo, luogo, data, tag colorati, conteggio media, toggle preferito

**Animazione:** Slide-in da sinistra con spring (tensione 65, frizione 11), backdrop semi-trasparente

---

### src/components/SettingsScreen.tsx (~627 righe) - Impostazioni

**Sezioni:**

1. **Lingua:** Griglia di 8 lingue con codici (IT, EN, ES, FR, DE, PT, ZH, JA)
2. **Posizione Casa:** Cerca tramite Nominatim + imposta, mostra con bandiera, pulsante rimuovi
3. **Sicurezza:** Toggle blocco biometrico (verifica capability dispositivo, richiede test auth prima di abilitare)
4. **Gestione Dati:**
   - Export: serializza trips in JSON → condividi via share sheet nativo (con import validation + sanitizzazione)
   - Import: seleziona file JSON → validazione e sanitizzazione dati → parse → conferma → merge
   - Elimina tutto: clearAll() da StorageService (con warning)
   - Backup cloud: salva in cartella backups del dispositivo
   - Pulizia media orfani: manuale + automatica ogni 7 giorni
   - **Storage Monitor (NUOVO):** Widget dettagliato con metriche storage
5. **Info:** Versione app, pulsante per rivedere onboarding
6. **Legale:** Link a Privacy Policy e Terms of Service (aprono modali)

**Storage Monitor (NUOVO):**
- Stato: `storageInfo`, `loadingStorage`
- Funzione `formatBytes(bytes)` per display KB/MB
- Carica dati con `StorageService.getStorageInfo()` quando il modale è visibile
- Mostra: tripCount, mediaCount, mediaSize, metadataSize, backupCount+Size, totalSize
- Warning ambra se metadataSize > 4 MB (limite AsyncStorage)

---

### src/components/StatsScreen.tsx (~158 righe) - Statistiche

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

### src/components/ItineraryManager.tsx (~287 righe) - Gestore Itinerari

- Sezione creazione: input testo + pulsante crea
- Lista itinerari: nome, conteggio viaggi, lista viaggi collegati con linea a punti
- Azioni per itinerario:
  - Play (flythrough): animazione camera attraverso tutti i viaggi
  - Rinomina: input inline
  - Elimina: conferma, orfana i viaggi (rimuove itineraryId)

---

### src/components/OnboardingScreen.tsx (~304 righe) - Tutorial

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

### src/components/PrivacyPolicy.tsx (~76 righe) - Privacy Policy

Testo completo tradotto in tutte le 8 lingue con 5 sezioni:
1. Raccolta Dati (NON raccoglie dati personali)
2. Dati Salvati Localmente (viaggi, GPS, foto, preferenze)
3. Servizi Esterni (Nominatim, Photon, expo-location per geocoding)
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

### src/components/SaveConfirmation.tsx (~68 righe) - Toast

Notifica breve animata:
- Appare al centro schermo
- Icona checkmark verde (personalizzabile)
- Messaggio custom
- Auto-nasconde dopo 1.2 secondi
- Animazione spring scale in, fade out

---

### src/components/OfflineBanner.tsx (~51 righe) - Banner Offline

Indicatore stato rete:
- Mostra quando offline (isConnected = false)
- Posizionato top-left
- Icona warning ambra
- Testo: "Sei offline" (il globo ora funziona offline grazie alle librerie vendor bundlate)
- Usa @react-native-community/netinfo

---

### src/components/ErrorBoundary.tsx (~138 righe) - Error Boundary

Cattura errori non gestiti nei componenti React:
- Class component con getDerivedStateFromError + componentDidCatch
- Mostra UI errore con icona, titolo, sottotitolo
- In dev: mostra messaggio errore + component stack
- Pulsante restart (expo-updates.reloadAsync)

---

### src/i18n/translations.ts - Traduzioni

~126 chiavi top-level tradotte in 8 lingue (~2183 righe totali).

```typescript
type Language = 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'zh' | 'ja';
type TranslationKey = keyof typeof it;  // tipo derivato dalle chiavi italiane

// Esempi di chiavi:
appName, addTrip, editTrip, deleteTrip, settings, statistics,
calendar, itineraries, search, sort, filter, save, cancel,
tripTitle, tripLocation, tripDate, tripNotes, tripTags,
onboardingTitle1/2/3, onboardingText1/2/3, onboardingStart,
privacyPolicy, termsOfService, language, biometricLock,
exportData, importData, deleteAllData, ...

// Chiavi Paywall (NUOVO):
paywallTitle, paywallSubtitle, paywallFeature1/2/3/4,
paywallButton, paywallRestore, paywallSuccess, restoreFailed

// Chiavi HelpGuide (NUOVO):
helpGuideTitle, helpGuideMenuItem,
helpAddTripTitle/Text, helpGlobeTitle/Text, helpFogTitle/Text,
helpItineraryTitle/Text, helpLinesTitle/Text, helpBackupTitle/Text,
helpWishlistTitle/Text, helpStatsTitle/Text
```

---

### src/utils/validateTrip.ts (~154 righe) - Validazione e Sanitizzazione Import

Modulo di validazione per i dati importati da file JSON esterno.

**Interfacce esportate:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Trip;
}

interface ImportResult {
  valid: boolean;
  trips: Trip[];
  errors: string[];
}
```

**Funzioni principali:**
```typescript
// Valida un singolo trip: verifica struttura, tipi, coordinate, date, media, tag
validateTrip(data: unknown): ValidationResult

// Valida e sanitizza un array di trip importati
// Supporta formato nuovo (con checksum) e formato legacy (array diretto o {trips, exportDate})
// Parametro opzionale existingItineraryIds per pulire riferimenti orfani a itinerari inesistenti
validateImportData(data: unknown, existingItineraryIds?: string[]): ImportResult
```

**Validazioni eseguite:**
- Struttura oggetto (campi obbligatori: id, title, locationName, latitude, longitude)
- Tipi corretti (string, number, boolean, array)
- Coordinate GPS valide (lat -90/+90, lon -180/+180)
- Formato data YYYY-MM-DD
- MediaItem con uri, type ('image'|'video'), width, height
- TripTag validi (8 categorie ammesse)
- Sanitizzazione: aggiunge campi default mancanti (tags, isFavorite, isWishlist, media, notes)
- Pulizia itineraryId orfani (se existingItineraryIds fornito)

---

### src/utils/geocoding.ts (~61 righe) - Geocoding

```typescript
// Ricerca luogo -> coordinate
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
  → useTrips: migrateData() (schema v0→v1 se necessario)
  → useTrips: carica trips + itineraries in parallelo da StorageService
  → useTrips: checkAndPerformAutoBackup() (background, ogni 7 giorni, con SHA-256)
  → useTrips: checkAndCleanOrphanedMedia() (background, ogni 7 giorni)
  → useAuth: se biometricEnabled → prompt autenticazione biometrica
  → Se !hasSeenOnboarding → mostra OnboardingScreen
  → Se !hasAcceptedGDPR → mostra GDPRConsent
  → Render UI principale: Globo + Header + Sidebar + Pulsanti
```

### Aggiunta Viaggio (con check freemium)
```
Utente preme "+" per aggiungere viaggio
  → handleAddTrip():
    → Conta viaggi non-wishlist
    → canAddTrip(count)?
      → Sì: apre TripForm
      → No (>=3 e non premium): apre PaywallScreen
```

### Salvataggio Viaggio
```
Utente compila TripForm → preme Salva
  → TripForm chiama onSave(tripData)
  → useTrips.saveTrip():
    → Se nuovo: genera id = Crypto.randomUUID() (UUID v4), createdAt = ISO string
    → Se modifica: aggiorna trip esistente nell'array
    → setTrips([...]) aggiorna stato React
    → Se itineraryId: aggiorna itinerary.tripIds
  → Debounce 800ms → StorageService.saveAll(trips, itineraries) (atomic multiSet)
    → Se errore: retry dopo 2s
    → Se retry fallisce: Alert visibile all'utente
  → Se app va in background: flush immediato del save pendente
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
- `@travelsphere_schema_version` → versione schema corrente (v1)
- `@travelsphere_last_backup` → timestamp ultimo backup
- `@travelsphere_last_cleanup` → timestamp ultima pulizia media orfani

### Livello 2: Media (expo-file-system)
- Directory: `FileSystem.documentDirectory/media/`
- File: JPEG/PNG compressi + MP4 video
- Riferiti tramite URI completo in Trip.media[].uri

### Caricamento
1. `migrateData()` - migra schema se necessario (v0 → v1)
2. Carica JSON da AsyncStorage (trips + itineraries in parallelo)
3. Su piattaforma nativa: verifica che tutti i file media esistano ancora
4. Rimuove riferimenti a file mancanti (cleanup)

### Salvataggio (Debounced + Atomico)
- Auto-save con debounce 800ms via useTrips hook
- Usa `StorageService.saveAll()` con `AsyncStorage.multiSet()` per atomicità
- Background flush: quando l'app va in background, flush immediato del save pendente
- Retry automatico dopo 2s se il salvataggio fallisce
- Alert visibile all'utente se anche il retry fallisce

### Schema Versioning & Migrazione
- Versione corrente: `CURRENT_SCHEMA_VERSION = 1`
- v0 → v1: aggiunge campi default (`tags:[], isFavorite:false, isWishlist:false, media:[], notes:''`)
- Migrazione idempotente, preserva campi esistenti
- Eseguita automaticamente all'avvio in useTrips

### Backup Automatico con Checksum SHA-256
- Ogni 7 giorni, al caricamento iniziale dell'app
- Backup include: dati + checksum SHA-256 + schemaVersion + createdAt
- Verifica integrità: rilegge il file scritto e ricalcola l'hash
- Rotazione solo dopo verifica positiva (non perde backup validi)
- Mantiene ultimi 3 backup (`MAX_BACKUPS`)
- Supporto retrocompatibile per backup legacy (senza checksum)

### Pulizia Media Orfani
- Automatica ogni 7 giorni (`CLEANUP_INTERVAL_MS`)
- Manuale tramite pulsante in Settings
- Scansiona directory media, confronta con riferimenti nei trips
- Elimina file non referenziati, riporta conteggio e byte liberati
- Solo piattaforma nativa (skip su web)

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
Ogni viaggio non-wishlist con countryCode popola il set `visitedCountries` in App.tsx. Questo set viene passato a EarthGlobe che lo invia alla WebView. Nel globo, i paesi visitati sono evidenziati con bordi poligonali cyan luminosi e un fill leggero semi-trasparente. I paesi non visitati hanno bordi appena visibili. Effetto: "scopri il mondo" man mano che viaggi, senza che gli elementi grafici coprano i pin.

### 2. Itinerari
Raggruppano viaggi sotto un nome. Ogni Trip ha un campo opzionale `itineraryId`. L'Itinerary tiene un array `tripIds`. Il pulsante "Play" nell'ItineraryManager attiva una flythrough animation: la camera vola sequenzialmente a ogni viaggio dell'itinerario. Gli archi animati collegano i viaggi dello stesso itinerario sul globo.

### 3. Sicurezza Biometrica
Opzionale. Usa expo-local-authentication per fingerprint/Face ID. Gestita dal hook `useAuth`: prompt all'apertura app e al ritorno da background (AppState listener). Prima di abilitare, testa se il dispositivo supporta biometria e fa un test di autenticazione.

### 4. Geocoding a Catena
Per massimizzare affidabilità con API gratuite rate-limited:
1. Nominatim (OSM) + Photon (Komoot) in parallelo → nessun permesso richiesto
2. Se entrambi falliscono: expo-location geocoder nativo → chiede permesso posizione
3. Primo risultato valido vince

### 5. Export/Import con Validazione
- **Export:** Mostra avviso privacy ("Il backup contiene coordinate GPS") → Serializza array trips in JSON → salva in cache FileSystem → condividi via share sheet nativo
- **Import:** Seleziona file JSON tramite document picker → **validazione e sanitizzazione dati** (verifica struttura, tipi, valori) → parse → mostra conferma con conteggio → merge nell'array trips esistente
- **Validazione backup:** Supporta formato nuovo (con checksum SHA-256) e legacy (senza checksum)

### 6. Wishlist
Trip con `isWishlist: true`. Pin rosa sul globo. Non contribuiscono al Fog of War (non sono stati visitati). Particelle flottanti rosa invece di rosse.

### 7. Supporto Offline Globo (NUOVO)
Le librerie vendor (globe.gl, topojson-client, dati paesi) sono bundlate localmente in `assets/vendor/`. EarthGlobe.tsx le inietta inline nell'HTML prima del caricamento. Fallback CDN disponibile se i file locali non sono accessibili.

### 8. Storage Monitor (NUOVO)
Widget nell'area "Gestione Dati" di Settings che mostra metriche dettagliate: conteggio trips, media count/size, metadata size, backup count/size, totale. Warning se metadata > 4 MB (limite AsyncStorage).

### 9. Timeout e Retry del Globo (NUOVO)
Se la WebView non segnala `ready` entro 15 secondi, viene mostrato un overlay di errore con pulsante "Riprova" che ricarica la WebView e resetta il timeout.

### 10. Schema Versioning (NUOVO)
Sistema di migrazione automatica dei dati. Versione corrente v1. Al primo avvio dopo aggiornamento, i trip esistenti vengono arricchiti con campi default mancanti (tags, isFavorite, isWishlist, media, notes) senza sovrascrivere dati esistenti.

### 11. Sistema Freemium con RevenueCat (NUOVO)
Modello freemium con acquisto one-time (no subscription). Tier gratuito: massimo 3 viaggi non-wishlist. Superato il limite, si mostra PaywallScreen con prezzo dinamico da RevenueCat. L'acquisto sblocca viaggi illimitati per sempre. In `__DEV__` l'utente è sempre premium. Il hook `usePurchase` gestisce stato premium, prezzo, acquisto e restore. Le API keys RevenueCat sono placeholder (`YOUR_ANDROID_KEY`) da configurare dall'utente.

### 12. Guida In-App (HelpGuide) (NUOVO)
Modale accessibile da sidebar e Settings con 8 sezioni di aiuto che coprono tutte le funzionalità dell'app: aggiunta viaggi, globo interattivo, fog of war, itinerari, linee di viaggio, backup, wishlist, statistiche e calendario. Completamente tradotta in tutte le 8 lingue.

### 13. Adaptive Zoom Visuals (NUOVO)
Transizioni visive dinamiche quando la camera scende sotto distanza 200. I bordi dei paesi visitati, l'atmosfera, l'halo, la griglia wireframe e lo scanner ring si sfumano progressivamente durante il deep zoom, per un'esperienza immersiva senza distrazioni visive. Camera minDistance ridotta da 110 a 70.

### 14. Label Collision Detection (NUOVO)
Algoritmo di rilevamento collisioni per le label dei pin sul globo. Proietta coordinate 3D in spazio 2D schermo, ordina per priorità (pin selezionato > home > altri), e nasconde label sovrapposte con bounding box 120x20px scalato in base all'altitudine della camera.

### 15. Dynamic Pin Clustering (NUOVO)
Raggruppamento dinamico dei pin basato su distanza schermo (soglia 35px). Pin troppo vicini vengono raggruppati in un cluster che mostra il conteggio. Il pin selezionato non viene mai clusterizzato. I cluster ereditano il colore (rosso per trip, rosa se tutti wishlist). Ricalcolato ad ogni cambio di zoom.

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
- expo-crypto (generazione UUID v4)

**Acquisti in-app:** react-native-purchases (RevenueCat SDK)
**Storage:** @react-native-async-storage/async-storage
**Network:** @react-native-community/netinfo

**Testing (devDependencies):**
- jest ^30.3.0
- ts-jest ^29.4.6
- @types/jest ^30.0.0

**Test Coverage (~960 righe totali):**
- `StorageService.test.ts` (~541 righe) - save/load, delete, migration, checksum backup, clear
- `useTrips.test.ts` (~309 righe) - saveTrip, deleteTrip, toggleFavorite, itineraries CRUD
- `geocoding.test.ts` (~110 righe) - geocode, reverseGeocode, extractCountry

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

**GitHub Actions (.github/workflows/build-android.yml):**
- Aggiornate da v4 a v5 per supporto Node.js 24
- Trigger: push su main e branch claude/**
- Runner: Ubuntu, Node 22, Java 17
- Pipeline: checkout → node setup → java setup → yarn install → expo install --fix → expo prebuild --platform android → gradle assembleRelease → APK rename → artifact upload (30 giorni retention)

**CodeMagic (codemagic.yaml):**
- Runner: Mac mini M1
- **Android:** node setup → expo install → expo prebuild → gradle bundleRelease → AAB + APK come artifacts
- **iOS:** pod install → xcodebuild archive → xcodebuild export → IPA come artifact

---

## DECISIONI ARCHITETTURALI

1. **No React Navigation** → Architettura single-screen a modali. Stato semplice, no deep linking necessario
2. **WebView per Globo** → globe.gl è una libreria JS/WebGL. Usare WebView evita la complessità di un bridge Three.js nativo
3. **Storage solo locale** → GDPR-compliant by design, sempre funzionante offline, nessun costo server
4. **Catena geocoding** → API gratuite hanno rate-limit. Tre provider in cascata massimizzano affidabilità
5. **Orientamento landscape** → Il globo 3D ha bisogno di spazio orizzontale per essere utilizzabile
6. **Context API, non Redux** → Sufficiente per un'app diario di viaggio senza flussi async complessi
7. **Tema scuro** → Riduce affaticamento visivo, fa risaltare gli accent luminosi (cyan, oro)
8. **Hook Extraction** → Logica estratta da App.tsx in 5 hook dedicati (useTrips, useModals, useAuth, useFogOfWar, usePurchase) per riusabilità e testabilità
9. **Vendor Bundling** → Librerie globe.gl bundlate localmente per supporto offline completo, con fallback CDN
10. **Atomic Save con Debounce** → `AsyncStorage.multiSet()` per consistenza trips/itineraries, debounce 800ms per performance, flush immediato su background
11. **Schema Versioning** → Sistema di migrazione dati per evoluzione dello schema senza perdita dati
12. **Backup con Checksum SHA-256** → Verifica integrità backup prima di ruotare i vecchi, retrocompatibile con formato legacy
13. **Freemium con RevenueCat** → Acquisto one-time, no subscription. Placeholder API keys per configurazione post-sviluppo. In __DEV__ sempre premium per test rapidi
14. **Pin Clustering client-side** → Raggruppamento basato su distanza pixel sullo schermo, nessun backend necessario, ricalcolato ad ogni zoom
15. **Label Collision Detection** → Algoritmo greedy con priorità per evitare sovrapposizioni, senza librerie esterne
