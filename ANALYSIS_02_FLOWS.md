# ANALYSIS 02 — Flussi Logici

> Ogni flusso è stato tracciato leggendo i file sorgente riga per riga.

---

## 2.1 Flusso Clustering → Globo ✓ CORRETTO

### Passo 1 — `trips` cambia in `useTrips`
`useTrips.ts`: `setTrips([...])` aggiorna lo state React, che viene propagato a `AppContent` in `App.tsx`.

### Passo 2 — `clusterTrips()` chiamato via useMemo
**`App.tsx:68-73`**
```ts
const clusteredPins = useMemo(
  () => clusterTrips(trips, settings.homeLocation || null),
  [trips, settings.homeLocation]
);
```
Dipendenze corrette. Si ricalcola su: cambio trip, cambio home location.

### Passo 3 — Risultato in `useMemo` (non `useState`)
`clusteredPins` è un valore derivato puro — nessun side effect, nessuna copia, nessun setState intermedio. ✓

### Passo 4 — Passaggio a EarthGlobe
**`App.tsx:226`**
```tsx
<EarthGlobe clusteredPins={clusteredPins} ... />
```

### Passo 5 — Serializzazione in EarthGlobe
**`EarthGlobe.tsx:161-170`** — `pinData()` mappa ogni `ClusteredPin`:
```ts
{
  id: p.id,              // = cluster.id = group[0].id
  latitude: p.latitude,
  longitude: p.longitude,
  isWishlist: p.isWishlist,
  isCluster: p.isCluster,
  clusterCount: p.tripIds.length,
  showArc: p.distanceFromHomeKm > 100,
  label: p.title,        // city name o "N città"
}
```
Inviato via `sendToWebView({ type: 'updateTrips', trips: pd, itineraries: itinData })`.

### Passo 6 — `globe.html` riceve in `handleCmd()`
**`globe.html:358`**
```js
if(d.type==='updateTrips'){_itineraries=d.itineraries||[];updateTrips(d.trips);}
```

### Passo 7 — `updateTrips()` → `renderPins()`
**`globe.html:474-485`** — mapping dei campi in `_trips`:
```js
{ id, latitude, longitude, isWishlist, showArc, isCluster, clusterCount, label }
```
In `renderPins()`:
- `t.id` → `tripId` nel pin object ✓
- `t.isCluster && t.clusterCount > 1` → pin più grande ✓
- `t.label && _currentAltitude < 2.5` → label visibile a zoom ravvicinato ✓
- `showArc` usato in `updateArcs()` ✓

### Passo 8 — Click pin
**`globe.html:344-351`** `onPin(p)`:
- early return se `p.tripId === '__home__'` ✓
- manda: `S({type:'pinClick', tripId: p.tripId})` dove `tripId = t.id = cluster.id`

### Passo 9 — React Native gestisce il click
**`EarthGlobe.tsx:251-263`**:
```ts
const cluster = clusteredPinsRef.current.find((c) => c.id === data.tripId);
const clusterTrips = cluster.tripIds.map((id) => allTrips.find((t) => t.id === id))
onPinClick(clusterTrips[0], clusterTrips);
```

### Passo 10 — App.tsx decide
**`App.tsx:227-233`**:
```ts
if (clusterTripList && clusterTripList.length > 1) {
  setPinSelectorTrips(clusterTripList);
  setPinSelectorVisible(true);          // → PinSelector modal
} else {
  selectTrip(trip);                     // → MemoryViewer
}
```

**Coerenza nomi verificata:** il campo `tripId` è coerente tra `renderPins()`, `onPin()`, `S()`, `handleMessage()`, e `clusteredPinsRef.find()`.

---

## 2.2 Flusso Acquisto Freemium ✓ CORRETTO (con avvertenza critica)

### Init `usePurchase`
**`usePurchase.ts:14-37`**:
1. Legge `@travelsphere_dev_mode` da AsyncStorage
2. Chiama `PurchaseService.initialize()`
3. Chiama `PurchaseService.isPremium()` → setta `isPremium`
4. Recupera prezzo via `PurchaseService.getPrice()` → default `'€3,49'`

**`__DEV__`**: non viene controllato esplicitamente — solo il flag dev mode.

### Dev Mode detection
- Scritto da: `SettingsScreen.tsx:99` — `AsyncStorage.setItem('@travelsphere_dev_mode', 'true'|'false')`
- Letto da: `usePurchase.ts:19` al mount, e da AppState listener su foreground:
  **`usePurchase.ts:40-45`**:
  ```ts
  const subscription = AppState.addEventListener('change', async (nextState) => {
    if (nextState === 'active') {
      const flag = await AsyncStorage.getItem(DEV_MODE_KEY);
      setIsDevModeState(flag === 'true');
    }
  });
  return () => subscription.remove();  // ✓ cleanup presente
  ```

### `canAddTrip(count)`
**`usePurchase.ts:65-69`**:
```ts
const canAddTrip = useCallback((currentTripCount: number): boolean => {
  if (isDevMode) return true;
  if (isPremium) return true;
  return currentTripCount < FREE_TRIP_LIMIT;   // FREE_TRIP_LIMIT = 3
}, [isPremium, isDevMode]);
```
Conta trip non-wishlist: chiamato con `trips.filter(t => !t.isWishlist).length` **App.tsx:135** ✓

### Gate in App.tsx
**`App.tsx:134-141`**:
```ts
const handleAddTrip = useCallback(() => {
  const nonWishlistTrips = trips.filter(t => !t.isWishlist).length;
  if (canAddTrip(nonWishlistTrips)) {
    openModal('form');
  } else {
    openModal('paywall');
  }
}, [trips, canAddTrip, openModal]);
```
✓ Gating corretto.

### PaywallScreen props
**`App.tsx:374-393`** → **`PaywallScreen.tsx:18`**:
```ts
interface Props {
  visible, onClose, price, onPurchase, onRestore, freeLimit
}
```
Tutti passati correttamente ✓

### Post-acquisto
`onPurchase()` chiama `PurchaseService.purchase()` → ritorna `boolean` → se `true`, `isPremium` viene aggiornato dal listener AppState al prossimo foreground. **Ma non viene aggiornato immediatamente**: c'è un ciclo "attiva → background → foreground" necessario.

⚠️ **Issue MEDIO:** Dopo l'acquisto riuscito, l'app chiude il paywall (animazione 1.5s), ma `isPremium` nel hook si aggiorna solo al prossimo `AppState → active`. In teoria se l'utente va subito a creare un trip il gate potrebbe non essersi ancora aggiornato. In pratica l'animazione da 1.5s coprirà quasi sempre il tempo, ma è una race condition.

### 7-tap dev mode in SettingsScreen
**`SettingsScreen.tsx:89-112`**:
- `DEV_TAP_TARGET = 7`
- Timer reset: 3000ms per reset tap counter ✓
- Cleanup devTapTimer su `handleVersionTap`: `clearTimeout` in ogni chiamata ✓
- **MA:** il `devTapTimer.current` timeout non viene cancellato al component unmount. Se la modale si chiude mentre il timer è attivo, il timer scade e chiama `setDevTapCount(0)` su un componente smontato. In React Native questo non causa crash (a differenza del web) ma è tecnicamente un leak.

---

## 2.3 Flusso Travel Lines ⚠️ PARZIALMENTE INCONSISTENTE

**`settings.showTravelLines`** → `App.tsx:238` → `EarthGlobe showTravelLines={...}` → `sendToWebView({type:'updateTravelLines', show:...})` → `globe.html _showTravelLines`

In `updateArcs()`:
```js
// Home→trip arcs: NON gated da _showTravelLines
if(_home && t && t.length > 0){
  t.forEach(x => { if(x.showArc && !x.isWishlist) a.push(...) });
}

// Itinerary arcs: gated da _showTravelLines  ✓
if(_showTravelLines && _itineraries && _itineraries.length > 0){ ... }
```

**Issue:** Il toggle "Travel Lines" in Settings disattiva **solo gli archi itinerario**. Gli archi home→trip (per pin a >100 km) **rimangono sempre visibili** indipendentemente dal toggle.

Potrebbe essere intenzionale (archi strutturali vs archi percorso) ma l'utente si aspetta che il toggle controlli tutte le linee.

**Severità: MEDIO** — Fix sicuro: aggiungere `_showTravelLines &&` al blocco home→trip.

### Campo `showArc` — source of truth
`ClusteredPin.showArc = distanceFromHomeKm > 100` — calcolato in `clusterTrips.ts:168`.
**Il campo `Trip.showArc` (utente toggle) viene completamente ignorato** — vedi §1.7.

### Archi itinerario passano per i cluster ✓
`itineraryData()` in `EarthGlobe.tsx:171-183` deduplicates stops per cluster:
```ts
const cluster = pins.find((c) => c.tripIds.indexOf(tripId) !== -1);
if (!cluster || seen.has(cluster.id)) continue;
stops.push({ lat: cluster.latitude, lng: cluster.longitude });
```
Archi itinerario usano le coordinate del cluster, non quelle raw del trip. ✓

---

## 2.4 Flusso Salvataggio Viaggio ✓ CORRETTO

### Guard anti-double-tap
**`TripForm.tsx:389`**: `if (isSavingRef.current) return;` — **il guard c'è** ✓
Poi: `isSavingRef.current = true` (riga 399) → reset in `catch` (riga 424) e in `resetForm()` (riga 84).

### Catena di salvataggio
```
handleSubmit() [TripForm.tsx:388]
  → onSave(tripData) [passato da App.tsx:347]
  → useTrips.saveTrip(tripData, editingTrip) [useTrips.ts:91]
  → setTrips([...]) [trigger useMemo clusteredPins]
  → useEffect([trips]) → debounce 800ms
  → StorageService.saveAll(trips, itineraries)
  → AsyncStorage.multiSet([[TRIPS_KEY, json], [ITIN_KEY, json]])  ✓
```

### Ricalcolo clustering automatico ✓
`useMemo([trips, settings.homeLocation])` → ricomputa `clusteredPins` → EarthGlobe riceve nuovi props → `useEffect([clusteredPins])` → `sendToWebView({type:'updateTrips',...})` ✓

### UUID generazione ✓
**`useTrips.ts:24`**: `return Crypto.randomUUID();` ✓

---

## 2.5 Flusso Import/Export e Backup ✓ CORRETTO

### Export
`SettingsScreen.tsx`: serializza trips+itineraries → `Crypto.digestStringAsync(SHA256)` per checksum → `Sharing.shareAsync()`. ✓

### Import
`DocumentPicker.getDocumentAsync()` → parse JSON → `validateImportData(json, existingTrips, existingItineraryIds)`.

**`validateTrip.ts:108`**:
```ts
export function validateImportData(
  json: unknown,
  existingTrips: Trip[],
  existingItineraryIds?: string[]
): ImportResult
```
- Usa `existingItineraryIds` per validare riferimenti itinerario ✓
- Dopo merge: `setTrips([...existingTrips, ...importedTrips])` → trigger debounce → storage ✓
- Clustering si ricalcola automaticamente via `useMemo` ✓

### Backup automatico
**`StorageService.ts:300-350`**:
- Intervallo: 7 giorni (`BACKUP_INTERVAL_MS`)
- SHA-256 del payload → verifica dopo scrittura → cancella se checksum non coincide ✓
- Rotazione: mantiene MAX_BACKUPS=3 file più recenti ✓
- Chiamato da `useTrips.ts:38`: `StorageService.checkAndPerformAutoBackup(...)` al load ✓

### Backup locale (StorageAccessFramework)
Implementato in `SettingsScreen.tsx` per Android. Usa `StorageAccessFramework.requestDirectoryPermissionsAsync()` + `createFileAsync()`. ✓
