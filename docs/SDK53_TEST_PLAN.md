# TravelSphere — SDK 53 Migration Test Plan (v1.0.4 → v1.1.0)

**Scope**: validate that the SDK 52 → SDK 53 migration on `feature/sdk-53-migration` does not regress functionality, with particular focus on the **upgrade-in-place data integrity** scenario (AsyncStorage 1.x → 2.x).

**Read this before merging the branch into `main` and shipping v1.1.0.**

---

## 0. Prerequisites

- Device: Samsung Galaxy (target Android 14/15 device — same one used during dev).
- Build artifacts:
  - **v1.0.4 AAB** (from `main`, versionCode 12) — must be installable. Take it from the EAS dashboard or rebuild from `main`.
  - **v1.1.0 AAB** (from `feature/sdk-53-migration`, versionCode 13) — the build produced by EAS for this branch.
- A backup of the v1.0.4 AAB stored locally before testing in case rollback is needed.

---

## 1. CRITICAL — Upgrade-in-place: AsyncStorage 2.x must not lose v1.0.4 data

This is the single highest-risk check. AsyncStorage bumped from `1.23.1` (SDK 52 baseline) to `2.1.2` (SDK 53 baseline). Internal storage backend changed (legacy SQLite → MMKV-like). Public API (`setItem` / `getItem` / `removeItem` / `multiSet`) stayed identical, so the source code in `src/services/StorageService.ts` did not require edits. **The migration of existing on-device data is what we must validate manually.**

### 1.1 Preparation (on a clean device or after uninstall)

1. Install **v1.0.4** AAB.
2. Open TravelSphere, complete the language selection / onboarding.
3. Create at least **5 trips** with varied data:
   - Trip A: text only, no photos.
   - Trip B: 1 photo, no GPS.
   - Trip C: 5 photos including 1 video, with GPS coordinates from EXIF.
   - Trip D: marked as wishlist, in an itinerary.
   - Trip E: marked favorite, with notes >200 chars, with tags.
4. Set a home location in Settings.
5. Enable biometric lock in Settings.
6. (If applicable) consume 2 of the 3 free trips so the freemium counter is at 2/3.
7. Force-close the app, then reopen and **screenshot**:
   - The globe with all 5 pins visible.
   - The Settings screen showing home location set and biometric lock on.
   - Any trip detail (e.g. Trip C) to capture the photo carousel.
8. Note the `versionCode` shown in Settings → About: **must read 12**.

### 1.2 Upgrade

1. Without uninstalling v1.0.4, install the **v1.1.0** AAB over it (Android allows in-place upgrade when signed with the same keystore).
2. Confirm install completes without prompting for data wipe.

### 1.3 Verification checklist after upgrade

| Check | Pass criterion |
|---|---|
| App launches without crash | Globe renders, no white screen |
| `versionCode` displayed | Settings → About reads **13** |
| Trip count | All 5 trips present on globe and in the list |
| Trip A integrity | Title, date, notes, tags, country code unchanged |
| Trip B integrity | The 1 photo loads (thumbnail + fullscreen) |
| Trip C integrity | All 5 photos + 1 video play; GPS marker correct on globe |
| Trip D integrity | Wishlist heart shown, still grouped in same itinerary |
| Trip E integrity | Favorite star shown, notes character count matches, tags preserved |
| Home location | Persisted in Settings; arc-to-home still rendered for Trip C |
| Biometric lock | Still on; cold-start triggers fingerprint/face prompt |
| Freemium counter | Still 2/3 (NOT reset to 0/3) |
| Language | Same as before upgrade |

**If ANY of the above fails on a real device**: STOP. Do not promote v1.1.0 to Production. Investigate `StorageService.ts` log output (Android Studio Logcat filter `[TravelSphere]`) for `AsyncStorage` read failures, and verify the AsyncStorage 2.x changelog for known migration caveats.

### 1.4 Rollback procedure (if 1.3 fails)

1. Do NOT uninstall v1.1.0 yet (uninstall deletes the data dir).
2. Use `adb backup com.travelsphere.app` to extract the app data (optional, only if you want to forensically inspect AsyncStorage files later).
3. Uninstall v1.1.0.
4. Reinstall v1.0.4 (data restored from a fresh state — i.e. the upgrade-in-place data is lost; this is the worst case).
5. File issue: which trip/setting was lost + Logcat output.

---

## 2. Globe (WebView + globe.gl)

Reason: `react-native-webview` went from `^13.16.0` (resolved 13.16.x) to `13.13.5` (Expo SDK 53 bundled), and the WebView native bridge is rebuilt against RN 0.79 instead of 0.76. The HTML file (`assets/globe.html`) is unchanged.

### 2.1 Visual checks

| Action | Expected |
|---|---|
| Cold launch | Globe loads within 15s (timeout in `EarthGlobe.tsx:115` triggers fallback if not) |
| Drag globe | Smooth rotation, 60fps target |
| Pinch zoom | Zoom in/out smooth, atmosphere visible at full zoom-out |
| Tap pin | Pulse ring animation appears (cyan, 900ms period, 1.8× radius) — added in v1.0.1 |
| Tap empty area | Selection cleared |
| Multiple pins same cluster | Cluster count shown, tap expands |
| Arcs to home | Render correctly for trips marked `showArc: true` |

### 2.2 Console / error checks

- Logcat: no `[TravelSphere] Globe WebView failed to load within 15s` (would mean the WebView never sends `ready`).
- Logcat: no `Uncaught TypeError` or `Three.js` errors from inside the WebView.

### 2.3 Memory

- Long session (30 min, switch in/out of globe view): no progressive RAM growth indicating WebView leak. Use Android Studio profiler if needed.

---

## 3. Camera & Photo Picker

Reason: `expo-image-picker` 16.0.0 → 16.1.4 (minor bump), but a minor in expo-image-picker has previously shipped breaking changes.

### 3.1 Photo Picker (Android 13+)

| Action | Expected |
|---|---|
| Trip form → tap "Gallery" | **System Photo Picker** opens (grey system UI, NOT app's gallery) |
| Select 5 photos | Compression overlay shows progress 0/5 → 5/5 |
| Save trip | All 5 thumbnails + originals saved to `FileSystem.documentDirectory + 'media/'` |
| EXIF auto-fill | If a photo has GPS, location field auto-populates and reverse-geocodes |

### 3.2 Camera

| Action | Expected |
|---|---|
| Trip form → tap "Camera" | Native Android camera opens (after permission grant) |
| Capture photo | Returns to app, photo compressed and saved |
| Capture video | Returns to app, video saved (no thumbnail generated — by design) |

### 3.3 Permissions

- First-time tap "Camera": permission dialog appears.
- After grant: `android.permission.CAMERA` shown in App Info → Permissions.
- `READ_MEDIA_*` permissions: **must NOT appear in App Info**. v1.0.3 removed them; v1.1.0 must keep them removed.

---

## 4. Freemium / IAP (RevenueCat)

Reason: `react-native-purchases ^9.14.0` resolves to latest 9.x. Peer dep says `react-native >= 0.73.0` so it accepts 0.79, but no in-the-wild evidence for SDK 53 + RN 0.79.

| Action | Expected |
|---|---|
| Tap "Add trip" with counter < 3 | Trip form opens |
| Tap "Add trip" with counter = 3 | Paywall opens, shows "TravelSphere Pro €3.49 one-time" |
| Tap purchase | Google Play billing UI opens (sandbox or live) |
| Complete purchase (sandbox) | Paywall dismisses, counter unlocks, no further paywall on future adds |
| Force-close + reopen | Entitlement persisted, no re-prompt |
| Restore purchases (Settings) | Restores entitlement if previously purchased on another install |

Note: test on a Google account that has access to RevenueCat sandbox or an internal track.

---

## 5. Biometric Auth (expo-local-authentication 15 → 16, major bump)

| Action | Expected |
|---|---|
| Settings → enable biometric lock | Prompts for fingerprint/face once, then on |
| Force-close → reopen | Biometric prompt blocks UI until success |
| Cancel biometric prompt | Returns to lock screen, no app access |
| Disable in Settings → reopen | No prompt, direct access |

The API surface used in `src/components/SettingsScreen.tsx` is limited to `authenticateAsync` and `hasHardwareAsync` — both stable across the 15→16 bump per the changelog, but verify on device anyway.

---

## 6. Safe-area / orientation (react-native-safe-area-context 4 → 5, major bump)

| Action | Expected |
|---|---|
| Landscape orientation | Locked, sidebar and globe full-bleed |
| Notch / cutout (if device has one) | UI does not overlap cutout |
| System bottom bar | Globe extends behind it, controls respect safe area |
| Rotate device 180° | Re-renders correctly, no clipped content |

---

## 7. 16 KB page-size compliance (the entire reason for this migration)

Run this BEFORE submitting v1.1.0 to Production:

```bash
bundletool build-apks --bundle=v1.1.0.aab --output=v1.1.0.apks --mode=universal
unzip -o v1.1.0.apks -d /tmp/v110-apks
unzip -o /tmp/v110-apks/universal.apk 'lib/arm64-v8a/*.so' -d /tmp/v110-so
for so in /tmp/v110-so/lib/arm64-v8a/*.so; do
  A=$(readelf -lW "$so" | awk '/LOAD/{print $NF; exit}')
  [ "$A" = "0x4000" ] && echo "✅ $(basename $so)" || echo "❌ $(basename $so) align=$A"
done | tee 16kb-report.txt
```

**Promote to Production only if every line shows `✅` and `align=0x4000`.**

Repeat for `armeabi-v7a` if you publish to 32-bit (not necessary for modern Play Store split-APK delivery; arm64 is what Android 15+ devices ship).

---

## 8. TypeScript & build sanity (CI / pre-PR)

Already validated in sandbox, but re-run on developer machine to be sure:

```bash
npx tsc --noEmit                  # expect: exit 0, 0 errors
npx expo-doctor                   # expect: only the pre-existing .expo/yarn.lock warnings (now fixed in this branch)
npx expo install --check          # NEW: requires internet to expo.dev; expect: "Dependencies are up to date"
```

The third command was not runnable in the migration sandbox (network blocked). It is the official cross-check of `package.json` vs `bundledNativeModules.json`. **Must pass before EAS Build.**

---

## 9. EAS Build (the actual binary)

```bash
npx eas-cli build --platform android --profile production
```

Expectations:
- Build image: Expo SDK 53 (NDK r27 + AGP 8.7 + Gradle 8.10 or newer).
- `prebuild` completes without errors (no more custom `withNdkVersion` plugin — gone in v1.1.0).
- Final AAB versionCode = 13.
- Build time around 15-25 min.

If build fails:
- **Cause: peer dep clash** → run `npm install --legacy-peer-deps` locally, commit the updated `package-lock.json`, retry.
- **Cause: stale android/ folder** → `rm -rf android` (gitignored, safe), retry.
- **Cause: EAS cache** → `eas build --clear-cache`.

---

## 10. Decision matrix after testing

| Section | Pass | Fail |
|---|---|---|
| §1 (data preservation) | Continue | **BLOCK** — do NOT promote v1.1.0. Investigate AsyncStorage 2.x migration. |
| §2 (globe) | Continue | Investigate WebView 13.13.5 ↔ globe.html compat. Roll back webview version. |
| §3 (camera/photo) | Continue | Investigate expo-image-picker 16.1.4 changelog for breaking changes. |
| §4 (IAP) | Continue | Block until RevenueCat ↔ RN 0.79 confirmed. Possibly bump to react-native-purchases 10.x. |
| §5 (biometric) | Continue | Block. expo-local-authentication 16 is a major; revert to 15 not possible on SDK 53. |
| §6 (safe-area) | Continue | Investigate. safe-area-context 5.x has known SSR regressions but mobile should be OK. |
| §7 (16 KB) | Continue → submit Production | **BLOCK**. The whole migration's purpose. If this fails, escalate. |
| §8 (TS / doctor) | Continue | Fix locally before EAS Build. |
| §9 (EAS Build) | Continue → §7 | Apply troubleshooting steps inline. |

If §1 and §7 both pass: **safe to merge to `main` and submit Production**.
If §1 fails: **revert the merge; stay on v1.0.4**.

---

## Appendix A — Why §1 is the high-risk item

AsyncStorage 1.23.1 stored data via a SQLite-backed `RKStorage` table in
`databases/RKStorage` inside the app data dir. AsyncStorage 2.x uses
`AsyncStorageDatabase.kt` against a newer schema. The 2.x library ships
with built-in migration logic that reads the old SQLite file on first
launch and re-inserts the rows into the new backend.

However, this migration is **best-effort, not guaranteed by Expo**:
- It can silently skip rows that fail to parse.
- It can fail entirely if the old DB is locked or corrupt.
- It runs once per install lifetime; if interrupted (force-close mid-migration), partial data may result.

The only reliable validation is: install v1.0.4, populate data, upgrade to v1.1.0, observe.

---

## Appendix B — Files NOT changed in this migration

For peace of mind, none of the following were modified between v1.0.4 and v1.1.0:

- `src/components/EarthGlobe.tsx` — globe rendering logic
- `assets/globe.html` — globe.gl WebView content
- `src/services/StorageService.ts` — AsyncStorage API surface (only the lib changed underneath)
- `src/services/PurchaseService.ts` — RevenueCat integration
- `src/components/Paywall.tsx` — freemium UI
- `src/i18n/translations.ts` — all 8 languages
- Any UI component (TripForm, TripList, Settings, Stats, Calendar, PinSelector, PhotoFullscreen, ItineraryManager)
- Any utility (clusterTrips, geocoding)

Only `package.json`, `app.json`, `.gitignore`, and removal of `plugins/withNdkVersion.js` changed.
