# ANALYSIS 01 — Struttura: Import, Barrel Exports, Tipi

> Verifica diretta di ogni file .ts/.tsx. Ogni finding è stato confermato con grep/read.

---

## 1.1 Import inutilizzati — NESSUNO trovato

Tutti gli import nei file analizzati sono effettivamente usati:

| File | Import sospetto | Esito |
|------|----------------|-------|
| `App.tsx` | `Animated`, `Easing` | ✓ usati: pulse animation righe 83-86 |
| `App.tsx` | `BackHandler` | ✓ usato: riga 167 (exit app) |
| `App.tsx` | `Alert`, `Linking` | ✓ usati: righe 162, 174 |
| `App.tsx` | `NavigationBar` | ✓ usato: righe 99-101 |
| `App.tsx` | `BlurView` | ✓ usato: riga 305 |
| `MemoryViewer.tsx` | `useWindowDimensions` | ✓ usato: riga 17 |
| `OnboardingScreen.tsx` | `FlatList` | ✓ usato: riga 104 |
| `SettingsScreen.tsx` | `Alert` | ✓ usato: righe 102, 120, 142, 147 |
| `StorageService.ts` | `Platform` | ✓ usato: `isWeb = Platform.OS === 'web'` riga 18 |
| `AppContext.tsx` | `useContext` | ✓ usato: riga 42 (`useContext(AppContext)`) |

---

## 1.2 Import circolari — NESSUNO

Struttura ad albero pulita:
```
App.tsx → components / hooks / services / utils / contexts
components → contexts / types / services / utils
hooks → services / types
services → types
utils → types
```
Nessun ciclo A→B→A rilevato.

---

## 1.3 Import da path inesistenti — NESSUNO

Tutti i path relativi esistono. `handleMessageFromRN` in `globe.html` è chiamato da `EarthGlobe.tsx:157` via `injectJavaScript` — non è codice morto nonostante non appaia in globe.html stesso.

---

## 1.4 Barrel Exports ⚠️

### `src/components/index.ts` — **INCOMPLETO**

```ts
// Presenti (15):
EarthGlobe, TripForm, MemoryViewer, TripSidebar, ErrorBoundary,
OnboardingScreen, GDPRConsent, SettingsScreen, PrivacyPolicy,
TermsOfService, StatsScreen, CalendarView, SaveConfirmation,
OfflineBanner, ItineraryManager

// MANCANTI (3):
❌ HelpGuide       — importato direttamente in App.tsx:29
❌ PaywallScreen   — importato direttamente in App.tsx:30
❌ PinSelector     — importato direttamente in App.tsx:31
```

**Severità: BASSO** — funziona perché App.tsx usa import diretti, ma il barrel è incoerente.
**Fix sicuro: sì**

### `src/hooks/index.ts` — ✓ COMPLETO

Esporta tutti e 5: `useTrips`, `useModals`, `useAuth`, `useFogOfWar`, `usePurchase`.

### `src/utils/index.ts` — **NON ESISTE**

`clusterTrips`, `validateTrip`, `countryFlags`, `geocoding` sono importati con path relativi diretti. Non è un bug funzionale ma impedisce import via barrel.

**Severità: BASSO** — Fix sicuro: sì

---

## 1.5 Path Aliases TypeScript — DEFINITI MA MAI USATI

In `tsconfig.json` sono configurati:
```json
"@/*": ["src/*"],
"@components/*": ["src/components/*"],
"@types/*": ["src/types/*"]
```

**Nessun file nel progetto usa questi alias.** Tutti gli import usano path relativi (`'../types'`, `'./EarthGlobe'`, ecc.).

**Severità: BASSO** — Non è un bug, è spreco di configurazione.

---

## 1.6 Tipi TypeScript (`src/types/index.ts`)

### Interfacce presenti ✓

| Interfaccia | Presente | Note |
|-------------|----------|------|
| `Trip` | ✓ riga 14 | Include `showArc?: boolean` (vedi §1.7) |
| `MediaItem` | ✓ riga 4 | |
| `Itinerary` | ✓ riga 33 | |
| `HomeLocation` | ✓ riga 49 | |
| `ClusteredPin` | ✓ riga 56 | Aggiunta nel refactor clustering |
| `EarthGlobeProps` | ✓ riga 68 | Aggiornata con `clusteredPins` e `onPinClick` con cluster |
| `GeocodingResult` | ✓ riga 42 | |
| `Coordinates` | ✓ riga 98 | |
| `TripFormProps` | ✓ riga 82 | |
| `MemoryViewerProps` | ✓ riga 90 | |
| `TAG_CONFIG` | ✓ riga 104 | |

### `EarthGlobeProps` aggiornata ✓

```ts
onPinClick: (trip: Trip, clusterTrips?: Trip[]) => void;  // ✓ cluster-aware
clusteredPins: ClusteredPin[];                             // ✓ presente
```

### Props inline non tipizzate ⚠️

**`TripForm.tsx:21`** — il componente usa un'intersezione inline invece di un'interfaccia pulita:
```tsx
const TripForm: React.FC<TripFormProps & { itineraries?: Itinerary[] }> = ...
```
`itineraries` non è in `TripFormProps`. **Severità: BASSO**

### PinSelector.Props.t tipizzato in modo ristretto ⚠️

```ts
// PinSelector.tsx:8
t: (key: string) => string;
```
Ma `useApp().t` ritorna `string | string[]`. Il tipo non combacia ma funziona perché in App.tsx `t` viene castato implicitamente.
**Severità: BASSO**

---

## 1.7 ⚠️ ALTO — `Trip.showArc` ignorato da clustering

**File:** `src/utils/clusterTrips.ts:168` e `src/components/TripForm.tsx:417`

`Trip` ha un campo `showArc?: boolean` che l'utente può attivare/disattivare nel form (toggle "Collega a Casa"). Questo valore viene salvato nel trip e passato a `useTrips.saveTrip()`.

**Ma** in `clusterTrips()`, il campo `ClusteredPin.showArc` viene calcolato puramente dalla distanza:
```ts
showArc: p.distanceFromHomeKm > 100,  // ignora completamente Trip.showArc
```

L'utente può attivare "Collega a Casa" nel form, ma **non ha effetto**: l'arco appare solo se il trip è a >100 km da casa.

**Impatto:** Feature UI non funzionante — il toggle "Collega a Casa" in TripForm è inutile.
**Fix sicuro: sì** (aggiungere `|| group[0].showArc` nella logica)

---

## 1.8 Tipi `any` espliciti

Presenti in diversi file per i nomi delle icone Ionicons:
```tsx
section.icon as any  // HelpGuide.tsx:57
icon as any          // SettingsScreen.tsx:389, SaveConfirmation props
cfg.icon as any      // TripForm.tsx:508
TAG_CONFIG[tag].icon as any  // TripSidebar.tsx:147, 268
```

**Pattern ripetuto:** il tipo `keyof ComponentProps<typeof Ionicons>['name']` è scomodo da scrivere, quindi si usa `as any`. Non causa crash ma bypassa il type-check.

**Severità: BASSO** in ogni singola istanza.

---

## 1.9 Traduzioni (`src/i18n/translations.ts`)

**Struttura:** 8 lingue, ~2199 righe totali. Ogni lingua usa `const en: typeof it = {...}` — questo **forza la parità di chiavi a compile time**. Impossibile avere chiavi mancanti in una lingua senza errore TypeScript.

**Chiavi per feature nuove verificate:**
- `paywallTitle`, `paywallSubtitle`, `paywallFeature1-4`, `paywallButton`, `paywallRestore` ✓
- `selectTrip`, `tripsInArea` (PinSelector) ✓
- `helpAddTripTitle/Text`, `helpGlobeTitle/Text`, ecc. (HelpGuide) ✓
- `freeTripsRemaining`, `showArcToHome` ✓

**Nessuna chiave mancante rilevata.** Il typing `typeof it` è la garanzia migliore possibile.
