# ANALYSIS 05 — Test Suite e Configurazione Build

---

## 5.1 Status Test Suite

### `npx jest` — **NON ESEGUIBILE**

`node_modules/` non è presente nel repository (non installato).

```
Error: node_modules/.bin/jest: No such file or directory
```

### Incompatibilità versioni Jest ⚠️ CRITICO

**`package.json`**:
```json
"jest": "^30.3.0",
"ts-jest": "^29.4.6"
```

`ts-jest@29` supporta **solo Jest 28 e 29**. Con Jest 30 il preset non verrà trovato:
```
Preset ts-jest not found
```

Anche dopo `npm install`, i test **falliranno** con questo mismatch. Serve aggiornare `ts-jest` a `^29.4.6 → ^30.x.x` (quando disponibile) o tornare a `jest@^29`.

**Fix:** `"jest": "^29.7.0"` oppure attendere che ts-jest rilasci una versione compatibile con Jest 30.

---

## 5.2 File di Test Presenti

| File | Test Count (stimato) | Copre |
|------|---------------------|-------|
| `src/services/__tests__/StorageService.test.ts` (541 righe) | ~24 | saveTrips, loadTrips, deleteTrip, itineraries, migrateData, backup con checksum SHA-256, clearAll |
| `src/hooks/__tests__/useTrips.test.ts` (310 righe) | ~9 | saveTrip (create + update), deleteTrip, toggleFavorite, itinerari |
| `src/utils/__tests__/geocoding.test.ts` (111 righe) | ~10 | geocodeWithNominatim, reverseGeocodeCountry, extractCountryFromLocationName |

---

## 5.3 Coverage — Funzioni Nuove SENZA Test

| Funzione/Hook | File | Test | Issue |
|--------------|------|------|-------|
| `clusterTrips()` | `src/utils/clusterTrips.ts` | ❌ | Logica clustering transitivo non testata |
| `getDistanceKm()` | `src/utils/clusterTrips.ts` | ❌ | Haversine mai verificato |
| `validateTrip()` | `src/utils/validateTrip.ts` | ❌ | Sanitizzazione dati importati non testata |
| `validateImportData()` | `src/utils/validateTrip.ts` | ❌ | Import flow non testato |
| `usePurchase` | `src/hooks/usePurchase.ts` | ❌ | Freemium gate non testato |
| `PurchaseService` | `src/services/PurchaseService.ts` | ❌ | RevenueCat integration non testata |
| `useFogOfWar` | `src/hooks/useFogOfWar.ts` | ❌ | Derivazione paesi visitati non testata |
| `useAuth` | `src/hooks/useAuth.ts` | ❌ | Biometric auth non testata |

**Priorità test mancanti:**
1. `clusterTrips` — logica complessa (clustering transitivo), critica per pin click
2. `validateImportData` — gestisce dati utente esterni
3. `usePurchase` / `canAddTrip` — monetizzazione

---

## 5.4 Qualità dei Test Esistenti

### `StorageService.test.ts` ✓
- Mock di `AsyncStorage`, `FileSystem`, `Crypto` ✓
- Testa migrazione schema (v0→v1) ✓
- Testa backup con checksum SHA-256 + verifica ✓
- Testa cleanup media orfani ✓
- Mock aggiornati rispetto al codice attuale ✓

### `useTrips.test.ts` ✓
- Mock di `StorageService.saveAll`, `checkAndPerformAutoBackup`, `checkAndCleanOrphanedMedia` ✓
- Testa CRUD base + itinerari ✓

### `geocoding.test.ts` ✓
- Mock di `fetch` ✓
- Testa fallback su errore ✓

---

## 6.1 Package.json — Dipendenze

### Dipendenze non importate nel codice JS/TS

| Pacchetto | In deps | Usato in src/ | Note |
|-----------|---------|---------------|------|
| `react-native-gesture-handler` | ✓ | ❌ | Nessun `import ... from 'react-native-gesture-handler'` trovato. Possibile dipendenza transitoria di Expo SDK. |
| `world-atlas` | ✓ | ❌ | Non importato — usato come CDN fallback in `globe.html`. Può essere rimossa se la vendorizzazione è sufficiente. |
| `globe.gl` | ✓ | ❌ (solo .txt) | Bundled come asset vendor, non ES import. La dipendenza npm non serve a runtime ma serve per la vendorizzazione. |
| `topojson-client` | ✓ | ❌ (solo .txt) | Stessa situazione di globe.gl. |

### `react-native-purchases` ✓

In `dependencies` (non devDependencies) ✓ — richiesto per produzione.

### Versioni problematiche

| Conflitto | Versione attuale | Problema |
|-----------|-----------------|---------|
| `jest` | `^30.3.0` | Incompatibile con ts-jest@29 |
| `ts-jest` | `^29.4.6` | Supporta solo Jest 28-29 |

---

## 6.2 App.json ⚠️ CRITICO

### `targetSdkVersion: 34` — SOTTO IL REQUISITO GOOGLE PLAY

```json
"android": {
  "targetSdkVersion": 34,
  "compileSdkVersion": 34
}
```

**Google Play richiede `targetSdkVersion ≥ 35` per tutte le nuove submission dal 1° agosto 2024.**

Un'app con targetSdk 34 non può essere pubblicata su Google Play come nuova app (può aggiornare app esistenti fino a maggio 2025, ma non creare listing nuovi).

**Fix:** `"targetSdkVersion": 35, "compileSdkVersion": 35`

⚠️ Attenzione: Expo SDK 52 (`"expo": "~52.0.0"`) supporta `targetSdkVersion: 35`. Il cambio è sicuro.

### Altri valori verificati

| Campo | Valore | Status |
|-------|--------|--------|
| `orientation` | `"landscape"` | ✓ |
| `package` | `"com.travelsphere.app"` | ✓ |
| `userInterfaceStyle` | `"dark"` | ✓ |
| `jsEngine` | `"hermes"` | ✓ |
| `newArchEnabled` | `false` | ✓ (sicuro, new arch opzionale) |

### Permessi Android (8)

```
ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION  ← location geocoding ✓
READ_EXTERNAL_STORAGE, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO  ← media picker ✓
CAMERA  ← ImagePicker ✓
USE_BIOMETRIC, USE_FINGERPRINT  ← LocalAuthentication ✓
```
Tutti coerenti con le funzionalità implementate. Nessun permesso dichiarato in eccesso.

---

## 6.3 eas.json ✓

```json
{
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "android": { "buildType": "apk" } },
    "production": {
      "autoIncrement": true,         ← ✓
      "android": { "buildType": "aab" }  ← ✓ Play Store
    }
  }
}
```

- Tutti e 3 i profili presenti ✓
- `autoIncrement: true` per production ✓
- AAB (non APK) per Play Store ✓
- `appVersionSource: "remote"` nel cli ✓

---

## 6.4 tsconfig.json

```json
{
  "strict": true,        ← ✓ mode strict attivo
  "skipLibCheck": true,
  "baseUrl": ".",
  "paths": { "@/*", "@components/*", "@types/*" }  ← mai usati nel codice
}
```

`noUnusedLocals` e `noUnusedParameters` non sono esplicitamente configurati (non inclusi da `strict: true` automaticamente). Abilitarli aiuterebbe a trovare variabili inutilizzate.

---

## 6.5 PurchaseService — Chiavi RevenueCat Placeholder ⚠️ CRITICO

**`src/services/PurchaseService.ts:5-6`**:
```ts
const REVENUECAT_ANDROID_KEY = 'YOUR_ANDROID_KEY';
const REVENUECAT_IOS_KEY = 'YOUR_IOS_KEY';
```

Con le chiavi placeholder, `Purchases.configure()` **lancerà un'eccezione** al primo avvio su dispositivo reale. L'app non potrà mostrare il prezzo corretto, e tutti i tentativi di acquisto falliranno.

In dev mode o se `isPremium=false` l'app funziona per le feature gratuite, ma il paywall mostrerà il prezzo hardcoded `'€3,49'` e non la valuta dell'utente.

**Fix:** Creare un account RevenueCat, configurare il prodotto in-app su Google Play Console, sostituire le chiavi.
