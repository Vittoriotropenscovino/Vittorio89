# TravelSphere 🌍✈️

**Diario di Viaggio Immersivo** - Un'app React Native con globo 3D interattivo per catalogare e visualizzare i tuoi viaggi.

![TravelSphere](https://img.shields.io/badge/Platform-iOS%20%7C%20Android-blue) ![Expo](https://img.shields.io/badge/Expo-SDK%2050-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.1-blue)

## 🚀 Caratteristiche

- **Globo 3D Interattivo**: Ruota e zooma un globo terrestre realistico con texture ad alta definizione
- **Pin Animati**: I viaggi salvati appaiono come pin 3D luminosi sul globo
- **Geocoding Intelligente**: Cerca qualsiasi luogo per nome (es. "Bali", "New York") e l'app trova automaticamente le coordinate
- **Galleria Immersiva**: Visualizza le foto dei tuoi viaggi in una galleria a schermo intero con scroll orizzontale
- **Design Cinematico**: UI moderna con effetti glassmorphism, ottimizzata per TV e schermi grandi
- **Modalità Landscape**: Forzata per la migliore esperienza visiva

## 📦 Dipendenze

```bash
# Installazione delle dipendenze
npx expo install

# Oppure installa manualmente:
npm install expo expo-status-bar expo-location expo-image-picker expo-blur expo-screen-orientation expo-gl react-native-gesture-handler react-native-reanimated @react-three/fiber @react-three/drei three @expo/vector-icons react-native-safe-area-context expo-av

# Dev dependencies
npm install -D @types/react @types/three typescript
```

## 🛠️ Setup Progetto

### 1. Crea un nuovo progetto Expo

```bash
npx create-expo-app TravelSphere --template blank-typescript
cd TravelSphere
```

### 2. Copia i file

Copia tutti i file di questo progetto nella cartella del tuo progetto Expo.

### 3. Installa le dipendenze

```bash
npx expo install expo-location expo-image-picker expo-blur expo-screen-orientation expo-gl expo-av react-native-gesture-handler react-native-reanimated react-native-safe-area-context

npm install @react-three/fiber @react-three/drei three
npm install -D @types/three
```

### 4. Configura Metro per Three.js

Crea o modifica `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.sourceExts.push('cjs');

module.exports = config;
```

### 5. Avvia l'app

```bash
npx expo start
```

## 📱 Struttura del Progetto

```
TravelSphere/
├── App.tsx                 # Componente principale
├── app.json                # Configurazione Expo (landscape mode)
├── package.json            # Dipendenze
├── tsconfig.json           # Configurazione TypeScript
└── src/
    ├── types/
    │   └── index.ts        # Definizioni TypeScript
    └── components/
        ├── EarthGlobe.tsx  # Globo 3D con Three.js
        ├── TripForm.tsx    # Form con geocoding
        ├── MemoryViewer.tsx# Galleria foto fullscreen
        └── index.ts        # Export dei componenti
```

## 🎮 Come Usare

1. **Ruota il Globo**: Trascina con il dito per esplorare la Terra
2. **Aggiungi Viaggio**: Tocca "Aggiungi Viaggio" → Cerca una città → Compila i dettagli
3. **Visualizza Memorie**: Tocca un pin rosso sul globo per vedere le foto
4. **Naviga Galleria**: Scorri orizzontalmente per vedere tutte le foto

## 🔧 Configurazione app.json

L'app è configurata per:
- Orientamento **LANDSCAPE** forzato
- **Dark mode** di default
- Permessi per **Location** e **Photo Library**

```json
{
  "expo": {
    "orientation": "landscape",
    "userInterfaceStyle": "dark",
    "plugins": [
      "expo-location",
      "expo-image-picker",
      ["expo-screen-orientation", { "initialOrientation": "LANDSCAPE" }]
    ]
  }
}
```

## 🌐 Geocoding

L'app utilizza `expo-location` per convertire i nomi dei luoghi in coordinate:

```typescript
// Esempio di geocoding
const results = await Location.geocodeAsync("Tokyo");
// Risultato: [{ latitude: 35.6762, longitude: 139.6503 }]
```

Se il luogo non viene trovato, viene mostrato un alert "Luogo non trovato".

## 📺 Ottimizzato per TV

L'app è progettata per essere collegata alla TV tramite:
- AirPlay (iOS)
- Chromecast (Android)
- Cavo HDMI

L'interfaccia landscape e i grandi elementi touch rendono l'esperienza perfetta per presentare i viaggi a famiglia e amici.

## 🎨 Design System

| Colore | Hex | Uso |
|--------|-----|-----|
| Primary Blue | `#3B82F6` | Pulsanti, accent |
| Glow Blue | `#60A5FA` | Logo, highlight |
| Pin Red | `#EF4444` | Marker normali |
| Background | `#050510` | Sfondo scuro |
| Text Primary | `#FFFFFF` | Testi principali |
| Text Secondary | `#9CA3AF` | Label, hint |

## 📄 Licenza

MIT License - Usa liberamente per progetti personali e commerciali.

---

Fatto con ❤️ per gli amanti dei viaggi
