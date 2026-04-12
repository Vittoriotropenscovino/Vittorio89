# TravelSphere -- Architecture Overview

This document describes the high-level architecture of TravelSphere for developers joining the project.

## App Structure

TravelSphere uses a **single-screen, modal-based architecture**. There is no React Navigation router. The entire UI is a stack of layered modals rendered on top of a full-screen 3D globe. Visibility of each modal is controlled by boolean state variables in `App.tsx`.

## Component Hierarchy

```
App.tsx
└── ErrorBoundary
    └── AppProvider (React Context)
        └── AppContent
            ├── EarthGlobe          -- Full-screen WebView rendering globe.gl
            ├── TripSidebar         -- Animated slide-in panel listing trips
            ├── TripForm            -- Modal: create / edit a trip
            ├── MemoryViewer        -- Modal: full-screen media gallery
            ├── SettingsScreen      -- Modal: app preferences
            ├── StatsScreen         -- Modal: travel statistics dashboard
            ├── CalendarView        -- Modal: calendar-based trip browser
            ├── ItineraryManager    -- Modal: group trips into itineraries
            ├── PinSelector         -- Modal: pick a trip from a clustered pin
            ├── GDPRConsent         -- Gate: blocks UI until consent is given
            ├── OnboardingScreen    -- Gate: shown on first launch only
            ├── PrivacyPolicy       -- Modal: privacy policy text
            ├── TermsOfService      -- Modal: terms of service text
            ├── SaveConfirmation    -- Overlay: brief save-success feedback
            └── OfflineBanner       -- Overlay: network-offline indicator
```

## State Management

- **AppContext** (`src/contexts/AppContext.tsx`) -- Provides app-wide settings, the current language, and the translation function (`t()`). Consumed via `useAppContext()`.
- **Local state in App.tsx** -- Trip data, itineraries, and all modal-visibility flags live as `useState` hooks inside `AppContent`. Data is loaded from storage on mount and written back on every mutation.
- **Derived state** -- `clusteredPins` is computed via `useMemo` from `trips` + `homeLocation` using the `clusterTrips()` utility (`src/utils/clusterTrips.ts`). Nearby trips (< 30 km) are merged into a single `ClusteredPin` before being sent to the globe.

There is no Redux, Zustand, or other external state library.

## Storage Layer

All data is persisted locally on the device. Nothing is sent to a remote server.

| Store | Technology | Contents |
|-------|-----------|----------|
| Metadata | `@react-native-async-storage/async-storage` | Trips (JSON), itineraries, settings, GDPR consent, onboarding flag |
| Media | `expo-file-system` | Photos and videos copied from the camera roll into the app's document directory |

`StorageService` (`src/services/StorageService.ts`) wraps both stores behind a single API.

## Globe Communication Protocol

`EarthGlobe` is a `react-native-webview` that loads an HTML page embedding the globe.gl library. Communication between React Native and the WebView uses `postMessage` / `onMessage`.

### React Native to WebView

Messages are sent via `webViewRef.current.injectJavaScript(...)` calling `handleMessageFromRN()`.

| Message type | Payload | Purpose |
|-------------|---------|---------|
| `updateTrips` | `{ trips: [...], itineraries: [...] }` | Render clustered pins and itinerary arcs |
| `updateHome` | `{ home: { latitude, longitude, name } }` | Place the home-location marker |
| `updateTravelLines` | `{ show: boolean }` | Toggle travel-line arcs |
| `updateVisitedCountries` | `{ countries: string[] }` | Fog of war country highlighting |
| `flyTo` | `{ lat, lng }` | Animate the camera to a location |
| `flythrough` | `{ stops: [{ lat, lng }] }` | Camera flythrough along itinerary stops |
| `cleanup` | -- | Dispose Three.js resources on unmount |

### WebView to React Native

Messages are sent via `window.ReactNativeWebView.postMessage(JSON.stringify(msg))`.

| Message type | Payload | Purpose |
|-------------|---------|---------|
| `ready` | -- | Globe has finished initializing |
| `pinClick` | `{ tripId }` | User tapped a pin; EarthGlobe resolves the cluster and calls `onPinClick` |
| `log` | `{ message }` | Debug logging forwarded to RN console |
| `flythroughDone` | -- | Flythrough animation completed |

## Geocoding Pipeline

When the user searches for a location, the app tries multiple providers in order:

1. **Nominatim** (OpenStreetMap) -- primary, free, no API key
2. **Photon** (Komoot) -- fallback, also free, different result set
3. **expo-location** (device geocoder) -- final fallback using the OS-level geocoder

The logic lives in `src/utils/geocoding.ts`. The first provider to return a result wins; if all three fail, the user sees an error message.

## App Startup Flow

```
App launch
  |
  v
Loading screen (load fonts, read storage)
  |
  v
Biometric authentication (if enabled in settings)
  |
  v
Onboarding screen (first launch only)
  |
  v
GDPR consent gate (must accept before proceeding)
  |
  v
Main UI (globe + sidebar)
```

Each gate is skipped on subsequent launches once its condition is satisfied (onboarding completed, consent given). Biometric auth runs every time the app opens if the user has enabled it.

## Pin Clustering Pipeline

Clustering is performed in React Native **before** data is sent to the WebView, keeping a single source of truth for pin positions.

```
trips + homeLocation
  |
  v
clusterTrips()  (src/utils/clusterTrips.ts)
  - Haversine distance, 30 km radius
  - Transitive chain clustering (A-B-C grouped even if A-C > 30 km)
  - Filters invalid coordinates (0,0 / NaN)
  - Computes centroid, distanceFromHomeKm, isWishlist
  |
  v
ClusteredPin[]  (useMemo in App.tsx)
  |
  v
EarthGlobe receives clusteredPins prop
  - pinData() maps to WebView format (showArc = distanceFromHomeKm > 100)
  - itineraryData() deduplicates stops through clusters
  |
  v
WebView renders pins at cluster centroids
  - Cluster pins are 10-50% larger
  - Home->trip arcs only for pins > 100 km from home
  - closeFactor (0.25-1.0) scales all sizes at close zoom
```

When a user taps a clustered pin, `EarthGlobe.handleMessage` resolves the cluster from `clusteredPinsRef`, builds the trip array, and calls `onPinClick(primaryTrip, clusterTrips)`. If the cluster has > 1 trip, `App.tsx` opens the `PinSelector` modal; otherwise it opens the trip directly.

## Key Design Decisions

1. **No navigation library** -- The app has a single logical screen. Modals are simpler and avoid navigation-state bugs.
2. **WebView for the globe** -- globe.gl is a JavaScript/WebGL library. Running it inside a WebView avoids bridging Three.js to React Native and provides better rendering performance.
3. **Local-only storage** -- Keeps the app simple, private, and fully offline-capable. No backend infrastructure to maintain.
4. **Fallback geocoding chain** -- Free APIs have rate limits and occasional downtime. Chaining three providers maximizes reliability without requiring paid API keys.
5. **Real clustering in React Native** -- Nearby trips (< 30 km) are grouped into clusters before the WebView receives them. This replaces the old approach of spreading overlapping pins inside the WebView, providing consistent behavior across pin rendering, popup selection, arcs, and flythrough.
