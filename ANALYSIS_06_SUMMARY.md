# ANALYSIS 06 — Sommario Esecutivo e Raccomandazioni

> File sorgente analizzati: 34 (.ts/.tsx) + assets/globe.html + package.json + app.json + eas.json
> Ogni finding è stato verificato con lettura diretta o grep — nessuna assunzione.

---

## Sommario Esecutivo

| Severità | Count |
|----------|-------|
| CRITICO | 3 |
| ALTO | 2 |
| MEDIO | 5 |
| BASSO | 8 |
| **Totale** | **18** |

**Test status:** Non eseguibili (node_modules assente + incompatibilità jest@30/ts-jest@29).
**Flussi funzionanti:** Clustering, Freemium gate, Salvataggio, Import/Export, Backup, Flythrough.
**Codice morto in globe.html:** Zero (tutte le funzioni e variabili storiche sono state rimosse correttamente).

---

## 1. Problemi Critici

### [CRITICO-1] `targetSdkVersion: 34` — Blocca pubblicazione Play Store
- **File:** `app.json:44`
- **Problema:** Google Play richiede `targetSdkVersion ≥ 35` per nuove app. Con 34 la submission viene rifiutata.
- **Impatto:** Impossibile pubblicare su Play Store come nuova app.
- **Fix sicuro:** Sì — cambiare in `35`. Expo SDK 52 lo supporta.

### [CRITICO-2] Chiavi RevenueCat placeholder
- **File:** `src/services/PurchaseService.ts:5-6`
- **Problema:** `'YOUR_ANDROID_KEY'` / `'YOUR_IOS_KEY'` → `Purchases.configure()` fallirà su device reale.
- **Impatto:** Acquisti impossibili. Prezzo non recuperato dal server (fallback hardcoded `'€3,49'`). Se l'eccezione non è intercettata, possibile crash all'avvio.
- **Fix sicuro:** Sì — sostituire con chiavi reali RevenueCat.

### [CRITICO-3] Incompatibilità jest@30 + ts-jest@29
- **File:** `package.json:72-73`
- **Problema:** `jest@^30.3.0` non è supportato da `ts-jest@^29.4.6`. Dopo `npm install`, `npx jest` darà `Preset ts-jest not found`.
- **Impatto:** Test suite completamente non eseguibile.
- **Fix sicuro:** Sì — downgrade a `jest@^29.7.0` oppure upgrade `ts-jest@^30.x` (quando disponibile).

---

## 2. Problemi Alti

### [ALTO-1] `Trip.showArc` (toggle TripForm "Collega a Casa") ignorato
- **File:** `src/utils/clusterTrips.ts:168` | `src/components/TripForm.tsx:417`
- **Problema:** Il campo `ClusteredPin.showArc` viene calcolato come `distanceFromHomeKm > 100`, ignorando completamente `Trip.showArc` salvato dall'utente.
- **Impatto:** Feature UI inutile — il toggle "Collega a Casa" nel form non ha effetto sul rendering degli archi.
- **Fix sicuro:** Sì — modificare `clusterTrips.ts` per usare `group.some(t => t.showArc) || distanceFromHomeKm > 100`.

### [ALTO-2] Toggle "Travel Lines" non disattiva archi home→trip
- **File:** `assets/globe.html:443-453`
- **Problema:** Il blocco home→trip arcs non è gated da `_showTravelLines`. Solo gli archi itinerario vengono disattivati dal toggle.
- **Impatto:** L'utente attiva "nascondi travel lines" ma gli archi home→trip restano visibili.
- **Fix sicuro:** Sì — aggiungere `if (_showTravelLines && _home && ...)` al blocco home→trip.

---

## 3. Problemi Medi

### [MEDIO-1] Race condition post-acquisto
- **File:** `src/hooks/usePurchase.ts:40-45` | `src/components/PaywallScreen.tsx:29-37`
- **Problema:** Dopo `onPurchase()` riuscito, `isPremium` si aggiorna solo al prossimo `AppState → active`. Se l'utente tenta immediatamente di aggiungere un trip (entro 1-2s) durante l'animazione di chiusura, il gate potrebbe ancora considerarlo free.
- **Impatto:** Raro, mitigato dall'animazione 1.5s. Fix: chiamare `setIsPremium(true)` direttamente in `PaywallScreen.handlePurchase` dopo successo.
- **Fix sicuro:** Sì.

### [MEDIO-2] Home→trip arcs sempre visibili (collegato ad ALTO-2)
Già descritto sopra.

### [MEDIO-3] `src/components/index.ts` barrel incompleto
- **File:** `src/components/index.ts`
- **Problema:** Mancano `HelpGuide`, `PaywallScreen`, `PinSelector`.
- **Impatto:** Chiunque importi dal barrel non trova questi componenti. App.tsx li importa direttamente quindi funziona, ma è incoerente.
- **Fix sicuro:** Sì.

### [MEDIO-4] `src/utils/index.ts` non esiste
- **Problema:** `clusterTrips`, `validateTrip`, `countryFlags`, `geocoding` non hanno barrel.
- **Fix sicuro:** Sì — creare il file.

### [MEDIO-5] Dipendenze npm non usate nel codice
- **File:** `package.json`
- `react-native-gesture-handler` → non importato in nessun file src (possibile transitoria Expo)
- `world-atlas` → non importato in JS (CDN fallback in globe.html, non serve come npm package)
- **Fix sicuro:** `world-atlas` può essere rimossa. `react-native-gesture-handler` verificare se richiesta da Expo SDK prima di rimuovere.

---

## 4. Problemi Bassi

### [BASSO-1] Path aliases tsconfig mai usati
- `@/*`, `@components/*`, `@types/*` definiti ma tutto il codice usa path relativi.
- Fix: usarli o rimuoverli dalla configurazione.

### [BASSO-2] `SettingsScreen` — `devTapTimer` senza cleanup all'unmount
- Timer di 3s non cancellato se il modale viene chiuso a metà tap sequence.
- Non causa crash in React Native, ma è tecnicamente un leak.

### [BASSO-3] `PinSelector` riceve `t` come prop invece di `useApp()`
- Tutti gli altri componenti usano `useApp()` direttamente. Inconsistenza di pattern.

### [BASSO-4] `TripFormProps & { itineraries?: Itinerary[] }` — tipo inline
- Il campo `itineraries` dovrebbe essere in `TripFormProps` nell'interfaccia ufficiale.

### [BASSO-5] `PinSelector.Props.t` tipo troppo stretto
- `t: (key: string) => string` ma `useApp().t` ritorna `string | string[]`.

### [BASSO-6] `handleGeocode` non in `useCallback` in TripForm
- Funzione ricreata ad ogni render, assegnata a `onPress`.

### [BASSO-7] `as any` per icone Ionicons (pattern ripetuto)
- In ~8 file per cast del tipo icona.

### [BASSO-8] `noUnusedLocals/noUnusedParameters` non configurati in tsconfig
- `strict: true` non li include automaticamente. Abilitarli aiuterebbe.

---

## 5. Codice Morto Trovato

### In `globe.html` — ZERO

Tutte le funzioni delle iterazioni precedenti sono state correttamente rimosse:
- ✅ `spreadPins()` — rimossa
- ✅ `clusterPins()` — mai esistita
- ✅ `_selectedPinId` — rimossa
- ✅ `closeFactor`/`spreadMult` globali — rimossi
- ✅ Fade materiale globo — rimosso
- ✅ Near clipping esplicito — rimosso

`handleMessageFromRN()` è **viva** — chiamata da `EarthGlobe.tsx:157` via `injectJavaScript`.

### Nel codice RN — ZERO import inutilizzati verificati

Tutti gli import in tutti i file sono stati confermati usati tramite grep diretto.

---

## 6. Parametri Globo Attuali (Riepilogo)

| Parametro | Valore |
|-----------|--------|
| minDistance | 103 |
| maxDistance | 600 |
| _closeFactor min | 0.5 |
| _closeFactor max | 1.0 |
| _zoomFactor min | 0.2 |
| _zoomFactor max | 1.5 |
| Trip pin radius | `(0.12+0.10z)*cf` |
| Home pin radius | `(0.25+0.15z)*cf` |
| Cluster bonus | `+10%/trip, max +50%` |
| Label size | `(0.35+0.45z)*cf` |
| Label dot | 0 (rimosso) |
| Label visibility | altitude < 2.5 |
| Arc stroke | 0.3 |
| Arc home→trip | rgba gold 0.7 → red 0.55 |
| Arc itinerary | rgba amber 0.65→0.55 |
| Globe material | #122d54 / emissive #0d3560 / FrontSide |
| Atmosphere | #00d4ff / altitude 0.25 |

---

## 7. Flussi Verificati

| Flusso | Status | Note |
|--------|--------|------|
| Clustering → Globo | ✅ OK | Coerenza nomi verificata end-to-end |
| Click pin → PinSelector/Viewer | ✅ OK | tripId = cluster.id confermato |
| Freemium gate | ✅ OK | Con avvertenza race condition post-acquisto |
| Dev mode 7-tap | ✅ OK | Scrittura/lettura AsyncStorage corretta |
| Salvataggio trip | ✅ OK | Guard anti-double-tap presente |
| Travel lines toggle | ⚠️ PARZIALE | Non disattiva archi home→trip |
| Trip.showArc toggle | ❌ ROTTO | Ignorato da clusterTrips() |
| Import/Export | ✅ OK | validateImportData, merge, re-cluster |
| Backup automatico | ✅ OK | SHA-256, rotazione 3 backup |
| Flythrough | ✅ OK | Formato stops, guard, flythroughDone |

---

## 8. Raccomandazioni Prioritizzate

### Prima della pubblicazione (bloccanti)

1. **`targetSdkVersion: 35`** in `app.json` — senza questo non puoi pubblicare
2. **Chiavi RevenueCat reali** in `PurchaseService.ts` — senza questo il paywall crasha
3. **Downgrade jest a ^29.7.0** in `package.json` + `npm install` per rendere i test eseguibili

### Subito dopo (bug funzionali)

4. **Fix `Trip.showArc` ignorato** in `clusterTrips.ts` — il toggle "Collega a Casa" deve avere effetto
5. **Fix travel lines non nasconde archi home→trip** in `globe.html:updateArcs()`

### Post-pubblicazione (qualità)

6. **Fix race condition `isPremium`** — chiamare `setIsPremium(true)` direttamente dopo acquisto riuscito
7. **Aggiungere test** per `clusterTrips`, `validateImportData`, `usePurchase`
8. **Completare barrel** `src/components/index.ts` + creare `src/utils/index.ts`
9. **Rimuovere `world-atlas`** da dependencies (non usata come npm)
10. **Cleanup `devTapTimer`** all'unmount di SettingsScreen

---

## 9. Stato Generale

Il codebase è **solido e ben strutturato** per un progetto di questa complessità. I flussi principali (clustering, rendering, storage, auth, freemium) sono tutti coerenti e funzionanti. I problemi trovati sono principalmente:

- 2 configurazioni non aggiornate (targetSdk, RevenueCat keys) che **bloccano la pubblicazione**
- 2 bug funzionali specifici (showArc ignorato, travel lines parziali) che **impattano l'utente**
- 1 problema infrastrutturale (jest version) che **blocca i test**

Il refactoring clustering (Phase 4) è pulito, nessun residuo. La documentazione (ARCHITECTURE.md, DOCUMENTAZIONE_COMPLETA.md) è aggiornata al codice attuale.
