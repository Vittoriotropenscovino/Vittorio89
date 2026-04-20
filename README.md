# TravelSphere - Interactive Travel Journal

A React Native / Expo mobile app for cataloging and visualizing your travels on an interactive 3D globe. Record trips with photos and videos, organize them by country and itinerary, and relive your adventures through a full-screen globe rendered with globe.gl.

## Features

- **Interactive 3D Globe** -- Explore a realistic globe with animated trip pins (globe.gl rendered in a WebView)
- **Trip Management** -- Create, edit, and delete trips with photos, videos, dates, and notes
- **Itinerary Grouping** -- Organize multiple trips into named itineraries
- **Country-based Organization** -- Trips grouped by country with flag indicators
- **Calendar View** -- Browse trips by date on a visual calendar
- **Travel Statistics** -- Dashboard with visited countries, total trips, and timeline data
- **Biometric Security** -- Optional fingerprint / Face ID lock on app launch
- **Offline Support** -- All data stored locally via AsyncStorage and expo-file-system
- **GDPR Compliant** -- No remote servers; all personal data stays on the device
- **Multi-language** -- Italian and English, switchable in settings
- **Smart Geocoding** -- Location search via Nominatim, Photon, and expo-location fallback chain

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native 0.76 + Expo SDK 52 |
| Language | TypeScript 5.3 |
| 3D Globe | globe.gl (rendered inside a WebView) |
| Persistence | AsyncStorage (metadata) + expo-file-system (media) |
| Biometric Auth | expo-local-authentication |
| Geocoding | Nominatim + Photon + expo-location |
| Animations | react-native-reanimated |

## Getting Started

```bash
git clone <repo-url>
cd Vittorio89
yarn install
yarn start
```

Scan the QR code with the Expo Go app on your device, or press `a` for Android / `i` for iOS.

## Project Structure

```
src/
├── components/       # React components (15 files)
│   ├── EarthGlobe        # 3D globe (WebView + globe.gl)
│   ├── TripSidebar       # Animated slide-in trip list
│   ├── TripForm          # Create / edit trip modal
│   ├── MemoryViewer      # Full-screen media gallery
│   ├── SettingsScreen    # App settings modal
│   ├── StatsScreen       # Travel statistics
│   ├── CalendarView      # Calendar-based trip browser
│   ├── ItineraryManager  # Itinerary grouping
│   ├── GDPRConsent       # GDPR consent gate
│   ├── OnboardingScreen  # First-launch onboarding
│   ├── PrivacyPolicy     # Privacy policy display
│   ├── TermsOfService    # Terms of service display
│   ├── SaveConfirmation  # Save feedback overlay
│   ├── OfflineBanner     # Offline status indicator
│   └── ErrorBoundary     # Top-level error boundary
├── contexts/         # AppContext (settings, language, theme)
├── i18n/             # Translation strings (it, en)
├── services/         # StorageService (AsyncStorage + file system)
├── types/            # TypeScript interfaces (Trip, Itinerary, etc.)
└── utils/            # Geocoding helpers, country flag mapping
```

## Scripts

| Command | Description |
|---------|-------------|
| `yarn start` | Start the Expo development server |
| `yarn android` | Start and open on Android emulator / device |
| `yarn ios` | Start and open on iOS simulator / device |
| `yarn web` | Start and open in the browser |

## License

MIT License -- free to use for personal and commercial projects.
