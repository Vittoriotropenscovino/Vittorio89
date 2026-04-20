# ANALYSIS 03 — globe.html: Codice Morto, Parametri, WebView

> Lettura completa del file (509 righe). Verifica di ogni funzione e variabile.

---

## 3.1 Codice Morto — Funzioni

Tutte le funzioni presenti sono usate. Nessuna delle funzioni delle iterazioni precedenti è rimasta:

| Funzione cercata | Trovata? | Note |
|-----------------|----------|------|
| `spreadPins()` | ❌ | Rimossa completamente nel commit `e225462` |
| `clusterPins()` | ❌ | Mai esistita nel file (clustering sempre in RN) |
| `projectToScreen()` | ❌ | Rimossa |
| `renderPinsBasic()` | ❌ | Rimossa |
| `renderClustered()` | ❌ | Rimossa |
| `updateZoomVisuals()` | ❌ | Rimossa |
| `handleMessageFromRN()` | ✓ riga 354 | **NON è morta** — chiamata da `EarthGlobe.tsx:157` via `injectJavaScript` |

**Conclusione: ZERO funzioni morte.**

---

## 3.2 Variabili Globali — Tutte Usate

| Variabile | Usata? |
|-----------|--------|
| `globe` | ✓ essenziale |
| `_trips` | ✓ read/write in updateTrips, renderPins, updateArcs |
| `_itineraries` | ✓ read in updateArcs |
| `_zoomFactor` | ✓ formula radius/size/ring |
| `_closeFactor` | ✓ formula radius/size/ring/label |
| `_home` | ✓ renderPins + updateArcs |
| `_ready` | ✓ log + dbg |
| `_showTravelLines` | ✓ updateArcs |
| `_scanAnimId` | ✓ requestAnimationFrame + cleanup |
| `_visitedCountries` | ✓ isCountryVisited |
| `_countryFeatures` | ✓ globe.polygonsData |
| `_flythroughActive` | ✓ guard + autoRotate |
| `_currentAltitude` | ✓ label filter threshold |
| `dbg` | ✓ debug div |
| `_isoToNumeric` | ✓ isCountryVisited lookup |

Variabili storiche cercate e **non trovate** (rimosse correttamente):
- `_haloMesh`, `_gridLines`, `_scannerRing` come variabili globali → gli oggetti Three.js esistono ma solo come variabili locali nel blocco `go()`
- `_selectedPinId` → rimossa
- `closeFactor` (senza underscore) → rimossa
- `spreadMult` → rimossa
- `mat.transparent` fade logic → rimossa
- `c.object.near = 1` clipping → rimassa

---

## 3.3 Parametri Esatti Attuali

### Camera Controls

```js
c.autoRotate = true
c.autoRotateSpeed = 0.4           // scala con zoom: 0.4 * min(1, max(0.05, (zoomFactor-0.1)/1.0))
c.enableDamping = true
c.dampingFactor = 0.12
c.rotateSpeed = 0.8
c.zoomSpeed = 1.0
c.minDistance = 103
c.maxDistance = 600
c.enablePan = false
```

### Zoom Factors

```js
// _zoomFactor (riga 318) — scala rendering globale
_zoomFactor = Math.max(0.2, Math.min(1.5, (dist-100)/260))
// range: [0.2, 1.5]

// _closeFactor (riga 406) — shrink a zoom ravvicinato
_closeFactor = Math.min(1.0, Math.max(0.5, (dist-100)/150))
// range: [0.5, 1.0]  ← minimo 0.5 (cambio in commit 17a64c0)
```

### Pin Radius

```js
// Home pin
pointRadius = (0.25 + 0.15 * _zoomFactor) * _closeFactor

// Trip pin (base)
base = (0.12 + 0.10 * _zoomFactor) * _closeFactor
// Cluster modifier (+10% per trip, max +50%)
if (isCluster && clusterCount > 1):
  base *= 1 + Math.min(0.5, clusterCount * 0.1)
```

### Point Altitude

```js
pointAltitude = (0.01 + 0.04 * _zoomFactor) * _closeFactor
```

### Ring

```js
ringMaxRadius = (0.6 + 1.2 * _zoomFactor) * _closeFactor
ringPropagationSpeed = 2.5
ringRepeatPeriod = 1200
// Ring opacity: (1-t) * (isWishlist ? 0.4 : 0.6)
```

### Label

```js
labelSize = (0.35 + 0.45 * _zoomFactor) * _closeFactor
labelAltitude = 0.015 * _closeFactor
labelDotRadius = 0                  // rimosso dot (commit 17a64c0)
// Colori fissi (nessun fade per altitude):
//   Home:     rgba(255,215,0,0.95)
//   Wishlist: rgba(236,72,153,0.95)
//   Trip:     rgba(255,255,255,0.95)
// Label trip renderizzate SOLO se _currentAltitude < 2.5
```

### Archi

```js
arcStroke = 0.3
arcDashLength = 0.5
arcDashGap = 0.2
arcDashAnimateTime = 2000
arcAltitudeAutoScale = 0.45

// Home→trip (solo se showArc=true && !isWishlist):
colors: ['rgba(255,215,0,0.7)', 'rgba(239,68,68,0.55)']

// Itinerary (solo se _showTravelLines=true):
colors: ['rgba(245,158,11,0.65)', 'rgba(245,158,11,0.55)']
```

### Paesi (Fog of War)

```js
polygonAltitude = 0.009

// Visitati:
polygonCapColor    = 'rgba(0,220,255,0.12)'
polygonSideColor   = 'rgba(0,220,255,0.3)'
polygonStrokeColor = 'rgba(0,230,255,0.8)'

// Non visitati:
polygonCapColor    = 'rgba(0,0,0,0)'           // trasparente
polygonSideColor   = 'rgba(0,200,255,0.05)'
polygonStrokeColor = 'rgba(0,220,255,0.25)'
```

### Atmosfera e Materiale Globo

```js
showAtmosphere = true
atmosphereColor = '#00d4ff'
atmosphereAltitude = 0.25

// Globe material:
m.color.set('#122d54')
m.emissive.set('#0d3560')
m.emissiveIntensity = 0.5
m.shininess = 5
m.side = THREE.FrontSide    // ← FrontSide (fix da commit precedente)
```

### Luci Three.js

```js
rimLight1: DirectionalLight(0x00d4ff, 0.5) @ pos(-200,100,-200)
rimLight2: DirectionalLight(0x4488ff, 0.3) @ pos(200,-50,100)
ambLight:  AmbientLight(0x1a1a44, 0.5)
```

### Effetti Decorativi

```js
// Outer glow halo
SphereGeometry(102, 64, 64) — opacity 0.1 — BackSide

// Grid lines (lat/lon)
5 latitude lines @ [-60,-30,0,30,60]
12 longitude lines @ step 30°
opacity 0.09 — LineBasicMaterial

// Scanner ring (animato)
RingGeometry(100.2, 100.8, 48)
rotation.z += 0.003/frame
opacity = 0.06 + 0.06*sin(now*0.001)  → range [0.06, 0.12]
cancelAnimationFrame(_scanAnimId) nel cleanup ✓
```

---

## 3.4 Comunicazione WebView ✓

### RN → WebView (handleCmd)

| type | Handler | Campi attesi | Status |
|------|---------|-------------|--------|
| `updateTrips` | `updateTrips(d.trips)` + `_itineraries=d.itineraries` | `trips[]`, `itineraries[]` | ✓ |
| `updateHome` | `_home=d.home; renderPins(); updateArcs()` | `home: {latitude, longitude, name}` | ✓ |
| `updateTravelLines` | `_showTravelLines=d.show; updateArcs()` | `show: boolean` | ✓ |
| `updateVisitedCountries` | `_visitedCountries=d.countries; polygonsData()` | `countries: string[]` | ✓ |
| `flyTo` | `globe.pointOfView({lat,lng,altitude:1.8},1500)` | `lat`, `lng` | ✓ |
| `flythrough` | `startFlythrough(d.stops)` | `stops: [{lat,lng}]` | ✓ |
| `cleanup` | `cancelAnimationFrame` + dispose | — | ✓ |

### WebView → RN (S())

| type | Quando | Payload |
|------|--------|---------|
| `ready` | Globe init completato | `{}` |
| `pinClick` | Tap su pin non-home | `{tripId: cluster.id}` |
| `log` | Debug / errori | `{message: string}` |
| `flythroughDone` | Fine animazione flythrough | `{}` |

**Coerenza totale verificata.** Il campo `tripId` in `pinClick` corrisponde esattamente a `cluster.id` usato in `clusteredPinsRef.find()` in `EarthGlobe.tsx`.

---

## 3.5 Flythrough ✓

**`startFlythrough(stops)`**:
- Input: `stops: [{lat, lng}]` — formato confermato da `itineraryData()` in EarthGlobe.tsx ✓
- Guard: `_flythroughActive` previene sovrapposti ✓
- Prima tappa: altitude=2.5, dur=2000ms
- Tappe successive: altitude=1.8, dur=2500ms + 800ms buffer
- Fine: `S({type:'flythroughDone'})` + riattiva autoRotate ✓

---

## 3.6 Note su Throttling/Debounce del Rendering

`_zoomFactor` si aggiorna con debounce 3% + throttle 100ms (efficiente):
```js
if (Math.abs(f-_zoomFactor) > 0.03 || altChanged) { renderPins(); }
```

`_closeFactor` si aggiorna **ad ogni renderPins()** — nessun debounce separato.
I due sono calcolati con la stessa `dist` nella stessa invocazione → coerenti. ✓
