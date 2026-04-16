# ANALYSIS 04 — React Native: State, Effects, Callbacks, Componenti

---

## 4.1 Stato React Non Utilizzato — NESSUNO trovato

Ogni `useState` verificato ha setter e valore usati nel render o in callback.
Il pattern più a rischio era `useModals.ts` ma risulta pulito:
```ts
showSaveConfirm, saveMsg  // → esportati e usati in App.tsx per SaveConfirmation
```

---

## 4.2 useEffect senza Cleanup

### ✓ Cleanup presenti (verificati)

| File | Effect | Cleanup |
|------|--------|---------|
| `App.tsx` | `AppState.addEventListener` | ✓ `.remove()` |
| `App.tsx` | `setTimeout` (pulse anim) | ✓ `clearTimeout` |
| `usePurchase.ts` | `AppState.addEventListener` | ✓ `subscription.remove()` |
| `useAuth.ts` | `AppState.addEventListener` | ✓ `sub.remove()` |
| `useTrips.ts` | `AppState.addEventListener` + `setTimeout` debounce | ✓ `sub.remove()` + `clearTimeout` |
| `OfflineBanner.tsx` | `NetInfo.addEventListener` | ✓ `unsubscribe()` |
| `EarthGlobe.tsx` | `setTimeout` (15s ready timeout) | ✓ `clearTimeout(readyTimeoutRef.current)` |
| `EarthGlobe.tsx` | Unmount cleanup | ✓ invia `cleanup` alla WebView |

### ⚠️ Cleanup mancante

**`SettingsScreen.tsx` — `devTapTimer`**

Il timeout creato in `handleVersionTap` (chiamato da onPress):
```ts
devTapTimer.current = setTimeout(() => { setDevTapCount(0); }, 3000);
```
Non viene cancellato all'unmount del componente. Il `useEffect` presente pulisce solo su `visible=false`:
```ts
useEffect(() => {
  if (!visible) setDevTapCount(0);
}, [visible]);
```
Se l'utente chiude la modale esattamente mentre il timer è attivo (0-3s dopo il 6° tap), il timer scade e chiama `setDevTapCount` su un componente smontato.

In React Native (non web) questo non causa crash (nessun DOM warning), ma è tecnicamente un memory/state leak.

**Severità: BASSO** — Fix sicuro: aggiungere `return () => { if (devTapTimer.current) clearTimeout(devTapTimer.current); }` all'useEffect di cleanup.

---

## 4.3 useCallback/useMemo Mancanti

### ⚠️ TripForm — `handleGeocode` non è useCallback

**`TripForm.tsx:174`**:
```ts
const handleGeocode = async () => { ... };
```
Questa funzione è assegnata a un `onPress` di `TouchableOpacity`. Non è wrappata in `useCallback`, quindi viene ricreata ad ogni render. Non è un problema grave perché `TouchableOpacity` non è un PureComponent, ma è una buona pratica.

**Severità: BASSO**

### ⚠️ TripForm — funzioni geocoding definite dentro handleGeocode

**`TripForm.tsx:111,131,152`**: `geocodeWithNominatim`, `geocodeWithPhoton`, `geocodeWithNative` sono definite come funzioni locali dentro il componente (non dentro useCallback). Vengono ricreate ad ogni render. Non causano problemi poiché sono usate solo internamente.

**Severità: BASSO** — potrebbero essere estratte fuori dal componente come funzioni pure (già hanno tutti i parametri necessari come argomenti).

### ✓ useMemo/useCallback presenti dove necessario

| Componente | Hook | Target |
|-----------|------|--------|
| `App.tsx` | `useMemo` | `clusteredPins`, `stats` |
| `App.tsx` | `useCallback` | `handleSaveTrip`, `handleAddTrip`, `handleToggleTravelLines`, `hideNavigationBar` |
| `EarthGlobe.tsx` | `useMemo` | `webViewSource` |
| `EarthGlobe.tsx` | `useCallback` | `pinData`, `itineraryData`, `sendToWebView`, `handleMessage`, `retryLoad` |
| `TripSidebar.tsx` | `useMemo` | `filteredTrips`, `countrySections` |
| `StatsScreen.tsx` | `useMemo` | `stats` |
| `CalendarView.tsx` | `useMemo` | `tripsByDate` |
| `AppContext.tsx` | `useMemo` | `contextValue` |
| `AppContext.tsx` | `useCallback` | `persistSettings`, `updateSettings`, `setLanguage`, `t` |

---

## 4.4 Componenti — Analisi

### App.tsx (523 righe)

**Responsabilità:**
- Stato root: trips, itineraries, settings, modals, sidebar, auth, purchase, fogofwar
- Orchestrazione di tutti gli hook: useTrips, useModals, useAuth, useFogOfWar, usePurchase
- Render condizionale di 14 modali/overlay
- `clusteredPins` useMemo
- onFlythrough remapping degli stop

**Gestibile?** Sì — è il root component. La separazione in hook alleggerisce il file. Ulteriore refactoring (es. estrarre `AppContent` in un file separato) sarebbe utile ma non urgente.

---

### EarthGlobe.tsx (356 righe) ✓

**Passaggio clusteredPins → WebView:**
- `clusteredPinsRef` e `tripsRef` sincronizzati via `useEffect` → message handler legge sempre dati freschi senza re-render ✓
- `pendingPins` gestisce la race condition "WebView non pronta" ✓
- Nessuna doppia serializzazione (una sola `JSON.stringify` in `sendToWebView`) ✓
- Cleanup WebView all'unmount via `injectJavaScript('cleanup')` ✓

---

### TripForm.tsx (747 righe) ⚠️

Il file più grande del progetto. Gestisce:
- Form completo (titolo, data, location, note, media, tags, itinerario, wishlist, showArc)
- Tre provider geocoding (Nominatim, Photon, device)
- Media picker + compressione immagini + thumbnail
- Date picker custom

**Il guard `isSavingRef`**: ✓ presente e funzionante (riga 389, 399, 424, 84)

**Rifattorizzabile** in sub-componenti (MediaPicker, GeocoderInput, TagSelector, DatePicker) ma non urgente per la pubblicazione.

---

### SettingsScreen.tsx (673 righe) ⚠️

Gestisce: language, home location, travel lines toggle, biometric, export/import, backup, dev mode, storage info.

**Dev mode 7-tap:**
- `DEV_TAP_TARGET = 7` ✓
- Tap counter con timer reset 3000ms ✓
- Scrive `@travelsphere_dev_mode` su AsyncStorage ✓
- Chiama `onDevModeToggle(newVal)` → App.tsx → `setDevMode(newVal)` in usePurchase ✓
- Lettura iniziale stato dev mode dal visible=true effect ✓

**Issue:** `devTapTimer` non cancellato all'unmount (vedi §4.2).

---

### PinSelector.tsx (103 righe) ✓

Riceve props da App.tsx:
```tsx
<PinSelector
  visible={pinSelectorVisible}
  trips={pinSelectorTrips}           // ← array corretto dal cluster
  onSelect={(trip) => selectTrip(trip)}
  onClose={() => { setPinSelectorVisible(false); setPinSelectorTrips([]); }}
  t={t}
/>
```

**`t` come prop invece di `useApp()`**: PinSelector è l'unico componente che riceve `t` come prop esterna invece di usare `useApp()`. Funziona correttamente ma è inconsistente con tutti gli altri componenti.

**Stile:** usa `StyleSheet.create` con colori in linea con il tema dark. Nessun BlurView (ok per modal semplice).

---

## 4.5 Traduzioni — ✓ SICURE (type-safe)

**Meccanismo:** `const en: typeof it = {...}` forza TypeScript a richiedere le stesse chiavi di `it` in ogni lingua. Una chiave mancante causa un **errore di compilazione** — non un bug silenzioso.

**Chiavi per feature nuove verificate come presenti:**

| Feature | Chiavi | Presenti |
|---------|--------|---------|
| PaywallScreen | `paywallTitle`, `paywallSubtitle`, `paywallFeature1-4`, `paywallButton`, `paywallRestore`, `paywallSuccess`, `freeTripsRemaining` | ✓ |
| PinSelector | `selectTrip`, `tripsInArea` | ✓ |
| HelpGuide | `helpAddTripTitle/Text`, `helpGlobeTitle/Text`, `helpFogTitle/Text`, `helpItineraryTitle/Text`, `helpLinesTitle/Text`, `helpBackupTitle/Text`, `helpWishlistTitle/Text`, `helpStatsTitle/Text` | ✓ |
| Dev mode | `devModeEnabled`, `devModeDisabled` | ✓ |
| Clustering | `showArcToHome` | ✓ |

**Lingue:** 8 lingue presenti (`it`, `en`, `es`, `fr`, `de`, `pt`, `zh`, `ja`). Tutte con parità di chiavi garantita dal tipo.
