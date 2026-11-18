# Piano 1.4.0 – TravelSphere in verticale

Scritto il 18/11/2026, dopo l'invio della 1.3.0 (vc34) alla revisione di Google.
Solo piano: nessuna riga di codice finché non lo approvi.

## Calendario

| Quando | Cosa | Dove |
|---|---|---|
| Dicembre | Sviluppo del verticale, una schermata per commit, APK di prova ogni 2-3 schermate | ramo `verticale`, solo test interno |
| Dicembre | Nessun rilascio in produzione, salvo correzioni urgenti della 1.3.0 (da `main`) | `main` |
| Inizio gennaio | 1.3.1: solo R8/offuscamento + correzioni piccole (scritta «177 countries. rendering...», testi zh/ja rivisti) | `main` |
| Dopo la 1.3.1 | Il ramo `verticale` si riallinea a `main`, così la 1.4.0 contiene anche R8 | `verticale` |
| Fine gennaio | 1.4.0 verticale in produzione, dopo le tue prove sul telefono | `verticale` → `main` |
| Poi | iOS (elenco a parte: `docs/ELENCO_IOS.md`) | |

**Numeri di versione (versionCode).** Ogni AAB caricato, anche solo sul test interno, consuma un numero. E sul tuo telefono non si può tornare a un numero più basso senza disinstallare, cioè senza perdere i dati. Quindi:

- prove del verticale a dicembre: **40-49**;
- 1.3.1 a gennaio: **50**. È più alta di ogni prova del verticale, così la installi sopra senza disinstallare;
- 1.4.0: **51 e oltre**.

## Regole che restano

- New Architecture spenta.
- Nessun permesso nuovo, nessuna chiamata di rete nuova, nessuna analitica.
- RevenueCat, prezzo, FREE_TRIP_LIMIT e reviewPrompt.ts non si toccano.
- Il paywall cambia solo nella disposizione, mai nella logica o nei testi.
- La card resta in React Native puro.
- Testi nuovi in 8 lingue, con zh/ja elencati a parte.
- Nessun dato degli utenti cambia.
- Ogni passo ha i suoi test jest verdi.
- Ogni schermata ha il suo flusso Maestro, provato in verticale e in orizzontale.
- **Novità rispetto alla fase 1:** l'oro per «visitato» entra anche nelle schermate vecchie, come hai chiesto tu. È l'unico cambio di colore ammesso. Tutti gli altri colori restano.

## Come funziona la rotazione

- **Verticale = modo principale.** Girando il telefono si passa all'orizzontale, che resta com'è oggi più i ritocchi del punto 2.
- **`app.json`:** da `"orientation": "landscape"` a `"default"`. In `App.tsx` si toglie il blocco in orizzontale, che oggi si sblocca solo sull'emulatore.
- **Ogni schermata decide la disposizione dalle misure vere dello schermo** (useWindowDimensions), mai da misure prese all'avvio. Oggi solo `OnboardingScreen` legge le misure una volta sola all'avvio: va corretta.
- **Tutte le finestre (Modal) dichiarano entrambi gli orientamenti.** Su Android non cambia niente, ma su iPhone senza questa riga restano solo in verticale: lo facciamo adesso per iOS.
- **Un solo controllo condiviso «verticale o orizzontale»**, in un hook nuovo, invece di ripeterlo in ogni file.

---

## 1) Le schermate, una per una

Legenda: **V** = proposta per il verticale, **O** = cosa cambia in orizzontale.

### 1. Schermata principale (`App.tsx`)
- **V:**
  - In alto il globo, circa il 58% dello schermo, con TravelSphere e il menu sopra.
  - Sotto, un **pannello che sale dal basso**:
    - chiuso mostra la barra dei numeri e i due pulsanti «Dove sei stato?» e «Condividi il tuo globo»;
    - si tira su con il dito e mostra «Aggiungi Viaggio» (grande, a portata di pollice), «Itinerari», «Linee di viaggio» e i viaggi rimasti gratis.
  - La scheda «Inizia la tua avventura» e l'avviso del riepilogo dell'anno vanno dentro il pannello, non più sopra il globo.
- **O:** come oggi, con le etichette sui pulsanti (punto 2).
- **Rischio:** è la schermata più delicata, perché il globo (WebView) deve ridisegnarsi alla rotazione senza ricaricarsi. Va provata per prima.

### 2. Menu laterale (`TripSidebar`)
- **V:**
  - Largo l'86% dello schermo (oggi il 78%, massimo 420).
  - I 4 pulsanti rapidi (Statistiche, Calendario, Impostazioni, Guida) su 2 righe da 2, con testo intero: oggi il testo si rimpicciolisce per starci.
  - Righe dei viaggi più alte.
- **O:** invariato.
- **Da decidere:** una piccola foto di copertina (la prima del viaggio) su ogni riga. È una cosa nuova, quindi te la propongo ma non la do per scontata.

### 3. Viaggio aperto, il «diario» (`MemoryViewer`)
- **V:**
  - Intestazione dentro l'area sicura: il cestino non finisce più sotto la barra di stato (punto 4).
  - Foto principale larga quanto lo schermo, in proporzione 4:3.
  - Miniature da 56 a **88** punti; note leggibili per intero (oggi 1 riga).
- **O:** foto principale più alta, perché oggi la striscia delle miniature ruba spazio; miniature da 56 a **72**.
- **Etichette:** «Condividi», «Modifica», «Elimina», «Chiudi».

### 4. Foto a schermo intero (`PhotoFullscreen`)
- **V e O:** la foto riempie lo schermo nel verso giusto: girando il telefono, una foto orizzontale si vede grande.
- Lo zoom con il doppio tocco e lo scorrimento restano come oggi; il flusso Maestro 04 li controlla.

### 5. Aggiungi / modifica viaggio (`TripForm`, il file più grande)
- **V:**
  - Modulo a pagina intera che sale dal basso, campi su una colonna.
  - Le foto aggiunte in una griglia da 3 per riga, più grandi di oggi.
  - «Aggiungi Pin» sempre visibile in fondo, anche con la tastiera aperta.
- **O:** come oggi.
- **Calendario della data:** è già corretto (largo 310, 7 colonne) e sta anche sui telefoni stretti (360 punti).

### 6. Statistiche (`StatsScreen`)
- **V:** finestra larga il 94%.
  - I tre numeri restano su una riga.
  - Il grafico dei mesi più alto (da 120 a 160).
  - Il pulsante «Condividi il tuo globo» in fondo, a portata di pollice.
- **Oro:** il numero dei **paesi visitati** diventa oro. Viaggi e foto restano azzurri.
- **Da decidere:** il pulsante «Condividi il tuo globo» qui è azzurro, nella schermata principale è oro. Propongo l'oro anche qui: stessa azione, stesso colore.

### 7. Calendario Viaggi (`CalendarView`)
- **V:** finestra larga quanto lo schermo meno i margini.
  - Celle quadrate.
  - Sotto la griglia, l'elenco dei viaggi del mese.
- **O:** resta la versione compatta della 1.3.0.
- **Oro:** i giorni con un viaggio hanno il segno in oro.
- **Righe storte:** vedi il punto 4.

### 8. Impostazioni (`SettingsScreen`)
- **V:** già quasi pronta (88%, massimo 480). Pulsanti delle lingue 2 per riga, sezioni più ariose. Da controllare: backup, ripristino, impronta.
- **O:** invariata.

### 9. Itinerari (`ItineraryManager`) e scelta dei viaggi sovrapposti (`PinSelector`)
- **V:** larghezza 92%. L'elenco di `PinSelector` oggi è alto al massimo 300: in verticale diventa il 60% dello schermo.
- **O:** invariati.

### 10. Primo avvio: introduzione, consenso privacy, Privacy, Termini, Guida
- **`OnboardingScreen`:** passa a useWindowDimensions, perché oggi legge le misure una sola volta e girando il telefono si romperebbe. In verticale, immagine sopra e testo sotto.
- **`GDPRConsent`, `PrivacyPolicy`, `TermsOfService`, `HelpGuide`:** sono già testi che scorrono. Basta larghezza 92% e altezza massima entro l'area sicura.

### 11. Paywall (`PaywallScreen`)
- Solo la disposizione: larghezza 92% e pulsante di acquisto sempre visibile in fondo.
- Logica, prezzo e testi **non si toccano**.
- La prova completa di acquisto e ripristino si fa sulla 1.3.1, a gennaio.

### 12. Schermate nuove della 1.3.0
- «Dove sei stato?», risultato, «Aggiungi un viaggio qui», condivisione, riepilogo dell'anno.
- **Già fatte per i due orientamenti:** solo controllo, più i flussi Maestro in verticale (06 e 08 passano già).

### 13. Piccole: `SaveConfirmation`, `OfflineBanner`, `ErrorBoundary`
- Solo controllo che stiano dentro l'area sicura in verticale.

---

## 2) Ritocchi grafici

### Pulsanti sempre con etichetta
| Dove | Oggi | Proposta |
|---|---|---|
| Accanto ad «Aggiungi Viaggio», icona gialla a rete | solo icona | «Linee» (accende/spegne le linee tra i viaggi) |
| Accanto ad «Aggiungi Viaggio», icona gialla a ramo | solo icona | «Itinerari» |
| In alto a destra, televisore | solo icona | «Su TV» (apre le impostazioni di trasmissione schermo di Android) |
| In alto a destra, spegnimento | solo icona | «Esci» |
| Viaggio aperto: condividi, matita, cestino, X | solo icone | «Condividi», «Modifica», «Elimina», «Chiudi» |
| X di chiusura di Statistiche, Calendario, Impostazioni, Itinerari | solo X | «✕ Chiudi», come nella pagina del risultato della 1.3.0 |
| Cuore sui viaggi nel menu | solo icona | resta icona (è un interruttore piccolo), ma con la scritta «Preferito» quando è acceso |

Il primo commit del verticale parte dall'elenco completo, ricavato da un controllo automatico su tutti i pulsanti: un test jest che segnala ogni pulsante senza testo.

### Foto più grandi nel diario
- Viaggio aperto: foto principale a tutta larghezza in verticale; miniature da 56 a 88 in verticale e 72 in orizzontale.
- Modulo del viaggio: griglia da 3 per riga.
- Menu: copertina sulla riga, se la vuoi (vedi sopra).

### Oro per tutto ciò che è «visitato»
- **Barra dei numeri:** bandierina e numero dei paesi in oro (viaggi e media restano azzurri).
- **Statistiche:** numero dei paesi visitati in oro.
- **Menu, raggruppato per paese:** intestazione del paese con il conteggio in oro.
- **Calendario:** segno dei giorni con un viaggio in oro.
- **«Dove sei stato?», card e risultato:** già in oro.

**Non si toccano:** il globo, le puntine sul globo e l'icona. Sono lavori a parte, come hai detto.

---

## 3) L'avviso di Google su schermo orizzontale/verticale e Wi-Fi

**Cosa dice Google:** l'app «richiede» tre funzioni del dispositivo: schermo orizzontale, schermo verticale e Wi-Fi. Chi non le ha non vede l'app nel Play Store (Chromebook, visori Android XR, alcuni tablet).

**Da dove vengono:** l'ho controllato nel manifest finale della 34.

| Funzione | Causa |
|---|---|
| Schermo orizzontale | l'attività principale è bloccata in orizzontale (`app.json`) |
| Schermo verticale | un'attività del lettore di codici di Google ML Kit, che arriva con `expo-dev-client` (lo strumento di sviluppo), bloccata in verticale |
| Wi-Fi | il permesso ACCESS_WIFI_STATE di `@react-native-community/netinfo`, che serve alla scritta «sei offline» |

**Risposta, nella 1.4.0:**
1. Con il verticale l'attività principale non è più bloccata, quindi l'orizzontale non è più «richiesto».
2. Una piccola aggiunta in `app.json` (un plugin di configurazione di poche righe nel progetto) dichiara le tre funzioni **facoltative** (`required="false"`). Non è un permesso nuovo e non cambia niente per chi ha già l'app.
3. Verifica: dopo il primo AAB del ramo sul test interno, guardo in Play Console il catalogo dei dispositivi. I dispositivi supportati devono aumentare, nessuno deve sparire, e l'avviso deve sparire.

**Più avanti, non in questo lavoro:** valutare se togliere `expo-dev-client` dalle build del negozio. Toglierebbe l'attività di ML Kit e alleggerirebbe l'app, ma va provato a parte.

---

## 4) Cestino sotto la barra di stato e righe storte del calendario

**Cestino (`MemoryViewer`).** L'intestazione del viaggio aperto non tiene conto dell'area sicura in alto. In verticale la barra di stato copre i pulsanti: il flusso Maestro 02 in verticale si ferma proprio lì.
- **Correzione:** margine superiore uguale all'area sicura (useSafeAreaInsets), più le etichette del punto 2.
- **Prova:** il flusso 02 deve passare in verticale.

**Righe storte (`CalendarView`).**
- **Causa:** ogni cella è larga «1/7 della riga» in percentuale (14,2857%). Android arrotonda i decimali in modo diverso da riga a riga, e la fila dei giorni della settimana (L M M G V S D) è costruita in un altro modo. Così le colonne non cadono esattamente una sotto l'altra.
- **Correzione:** la stessa usata per il calendario della data nella 1.3.0. Si misura la larghezza vera della griglia, si calcola una cella in punti interi e la si usa sia per la fila dei giorni sia per le celle.
- **Prova:** un test jest come `datePickerGrid.test.ts` e uno screenshot in verticale e in orizzontale.

---

## 5) Stima dei giorni

Giorni di lavoro miei, compresi test jest, flussi Maestro e APK di prova.

| Blocco | Contenuto | Giorni |
|---|---|---|
| A. Fondamenta | ramo, rotazione, hook verticale/orizzontale, Modal nei due versi, funzioni facoltative (punto 3), test che segnala i pulsanti senza testo | 1 |
| B. Schermata principale | globo in alto + pannello dal basso, etichette in alto a destra e sulle icone gialle | 3 |
| C. Menu laterale | | 0,5 |
| D. Viaggio aperto + foto a schermo intero | cestino, foto più grandi, etichette | 1,5 |
| — APK di prova 1 | A + B + C + D | |
| E. Modulo del viaggio | | 1,5 |
| F. Statistiche + G. Calendario | righe storte comprese | 1 |
| H. Impostazioni + I. Itinerari/PinSelector | | 1 |
| — APK di prova 2 | | |
| J. Primo avvio, Privacy, Termini, Guida | | 1 |
| K. Paywall (solo disposizione) | | 0,5 |
| L. Schermate 1.3.0 + piccole | controllo | 0,5 |
| M. Oro per «visitato» nelle schermate vecchie | | 0,5 |
| — APK di prova 3 + AAB sul test interno | | |
| N. Giro finale | tutti i Maestro nei due versi, controllo su un telefono stretto (360) e su un tablet (emulatore), riallineamento dopo la 1.3.1 | 2 |
| **Totale** | | **circa 14 giorni** |

**Margine per gli imprevisti:** 3-4 giorni. Il punto più incerto è il globo che si ridisegna alla rotazione.

**Il calendario regge:**
- 14 giorni stanno in dicembre;
- la 1.3.1 a inizio gennaio porta via 2-3 giorni, compresa la tua prova completa di acquisto e ripristino;
- resta circa una settimana di gennaio per le tue prove del verticale prima della fine del mese.

**Dopo, a parte:** gli screenshot dello store in verticale, che mi chiederai tu.

## Cosa mi serve da te prima di partire

1. **Ok al piano**, o le modifiche.
2. **Copertina dei viaggi nel menu:** sì o no.
3. **Pulsante «Condividi» in Statistiche** in oro come nella schermata principale: sì o no.
4. **Etichette proposte** («Linee», «Itinerari», «Su TV», «Esci»): vanno bene o preferisci altre parole.
