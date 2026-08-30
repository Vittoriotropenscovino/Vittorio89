# Test automatici su device reale (Maestro + adb)

Flussi per pilotare TravelSphere su un telefono Android vero: screenshot, video
e verifica dei percorsi critici. Si lanciano **dal tuo PC**, non da una sessione
cloud: serve un telefono collegato via USB.

---

## ⚠️ Leggi prima

**Questi flussi girano sui tuoi dati veri.** Nessuno usa `clearState`, proprio
per non cancellarti i viaggi. Se aggiungi `clearState` a un flusso, **azzeri i
dati dell'app sul telefono**: usalo solo su un device di test.

Il flusso `02-aggiungi-viaggio` crea un viaggio vero e in fondo lo cancella. Se
commenti il blocco di pulizia, il viaggio resta.

---

## Preparazione (una volta sola)

1. **Android Platform Tools** (contiene `adb`) installate e nel PATH.
2. Sul telefono: Impostazioni → Info → 7 tap su "Numero build" → **Debug USB**.
3. Collega via USB, accetta il popup e verifica:
   ```
   adb devices
   ```
   Deve comparire il dispositivo come `device` (non `unauthorized`).
4. **Maestro**:
   ```
   powershell -c "iwr https://get.maestro.mobile.dev | iex"
   ```
5. **Installa l'app**. Serve un **APK**: l'AAB di produzione non è installabile
   con adb.
   ```
   npx eas-cli build --platform android --profile preview
   adb install -r nome-file.apk
   ```

---

## Uso

```bash
maestro test .maestro/01-smoke.yaml          # sempre questo per primo
maestro test .maestro/                       # tutti i flussi
maestro studio                               # interattivo: utile per tarare i tap
```

Gli screenshot finiscono nella cartella da cui lanci il comando.

### Video di una sessione
```bash
maestro record .maestro/05-screenshot-store.yaml
```
Oppure direttamente con adb (max 3 minuti):
```bash
adb shell screenrecord /sdcard/demo.mp4
adb pull /sdcard/demo.mp4
```

### Log durante i test
```bash
adb logcat -s ReactNativeJS
```
È lo stesso filtro che ha permesso di trovare il bug delle miniature.

---

## I flussi

| File | Cosa verifica | Prerequisiti |
|---|---|---|
| `01-smoke.yaml` | Avvio, caricamento globo, UI presente | nessuno |
| `02-aggiungi-viaggio.yaml` | Geocodifica, calendario, salvataggio | rete |
| `03-statistiche-condivisione.yaml` | Statistiche e **cattura PNG ShareCard** | ≥1 viaggio |
| `04-foto-zoom.yaml` | Zoom/pan foto (Reanimated 3 su SDK 54) | viaggio con foto |
| `05-screenshot-store.yaml` | Produce gli screenshot per il Play Store | vedi note nel file |

---

## Come sono agganciati gli elementi

Non ci sono `testID` nel codice, quindi i flussi usano:

1. **`accessibilityLabel`** — i più stabili, non cambiano con la lingua:
   `Menu`, `Add Trip`, `Exit`
2. **Testo italiano** della UI (`Statistiche`, `Salva`, `Conferma`…) — **si rompono
   se cambi la lingua dell'app**
3. **Coordinate in percentuale** — l'ultima risorsa, per elementi senza testo né
   label (icone). Sono i punti più fragili: se un flusso fallisce, quasi sempre è
   una coordinata da ritarare con `maestro studio`.

**Se vuoi flussi davvero solidi**, la strada è aggiungere `testID` ai componenti
chiave. È una modifica al codice dell'app, quindi non è stata fatta.

---

## Cosa Maestro NON può fare qui

- **Pinch a due dita**: non è supportato. `04-foto-zoom` usa il doppio tap, che
  attraversa lo stesso codice di scala. Il pinch vero va provato a mano.
- **Verificare che il PNG condiviso non sia vuoto**: apre lo share sheet e ne fa
  lo screenshot, ma il giudizio sull'anteprima è tuo.
- **Rotazione schermo / edge-to-edge**: il controllo dei bordi sotto notch e barra
  di navigazione va fatto a occhio, ruotando il telefono su entrambi i lati.
