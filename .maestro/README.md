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
| `02-aggiungi-viaggio.yaml` | Ricerca del luogo, calendario della data (7 colonne, Conferma visibile), salvataggio «Aggiungi Pin», cancellazione. Solo testID e testi, niente coordinate | rete |
| `03-statistiche-condivisione.yaml` | Statistiche aperte dalla **barra dei numeri** e **cattura PNG ShareCard** | ≥1 paese |
| `04-foto-zoom.yaml` | Zoom/pan foto (Reanimated 3 su SDK 54) | viaggio con foto |
| `05-screenshot-store.yaml` | Produce gli screenshot per il Play Store | vedi note nel file |
| `06-dove-sei-stato.yaml` | «Dove sei stato?»: 5 paesi, pagina del risultato con il globo, poi tutto rimesso com'era | nessuno |
| `07-condividi-dal-globo.yaml` | Condividi dalla schermata principale (card + foglio di Android) | ≥1 paese |
| `08-riepilogo-anno.yaml` | Riepilogo dell'anno con la data simulata | APK di prova |
| `09-primo-avvio.yaml` | Primo avvio da zero: lingua, introduzione, privacy, 5 paesi, risultato, condivisione. **Cancella i dati: solo emulatore** | emulatore |
| `10-calendario.yaml` | Calendario: colonne dritte, sempre 6 righe, giorni dei viaggi in oro | ≥1 viaggio |
| `11-impostazioni.yaml` | Impostazioni: «Chiudi», casa con «Cerca» ed «Elimina» | nessuno |
| `12-primo-avvio-privacy-guida.yaml` | Lingua, introduzione girando il telefono, consenso privacy, informativa, Guida e Termini. **Cancella i dati: solo emulatore** | emulatore |

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

---

## Aggiornamento 15/11/2026 (1.3.0)

- Maestro sul PC di sviluppo: `C:\Users\vitto\tools\maestro-2.12.1\maestro\bin\maestro`
  (serve `JAVA_HOME` = il Java di Android Studio). Sempre `--device emulator-5554`.
- Gli screenshot finiscono in `~/.maestro/tests/<data>/<flusso>/takeScreenshot/`.
- **06-dove-sei-stato**: segna 5 paesi rari, controlla il pannello, poi li toglie.
  Verticale solo con l'APK di prova a rotazione libera
  (`node android/costruisci-apk.mjs emulatore`):
  ```
  maestro test -e ORIENTATION=PORTRAIT .maestro/06-dove-sei-stato.yaml
  ```
- 02 e 03: `hint:` non esiste più in Maestro 2.x, sostituito da `text:`.
- 04 e 05 hanno bisogno di almeno un viaggio con foto: su un telefono o emulatore
  vuoto il 05 si ferma (il tasto indietro chiude l'app).
- **07-condividi-dal-globo**: pulsante "Condividi il tuo globo" sulla schermata
  principale → finestra con anteprima e nome → foglio di condivisione. Serve
  almeno un paese. Anche questo accetta `-e ORIENTATION=PORTRAIT`.
- 02: si ferma ancora (16/11) perché tocca il pulsante di ricerca a coordinate
  fisse; da riscrivere con riferimenti veri al passo 5.
- **08-riepilogo-anno**: riepilogo dell'anno con la data simulata (pulsante in
  alto a destra, solo negli APK `emulatore` e `prova`; pressione lunga = azzera
  gli avvisi chiusi). Controlla: niente avviso a giugno, avviso a dicembre,
  "Chiudi" vale per tutto quell'anno, l'anno dopo torna. Accetta `-e ORIENTATION=PORTRAIT`.
