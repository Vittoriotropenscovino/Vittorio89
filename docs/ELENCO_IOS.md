# Elenco per iOS – cosa va cambiato

Scritto il 18/11/2026, alla fine della fase 1 (1.3.0). È solo un elenco: non ho modificato niente.
Il lavoro su iOS parte dopo la 1.4.0 verticale in produzione. Il verticale è il primo passo anche per l'iPhone, che si usa quasi sempre in verticale.

Ogni punto dice cosa c'è oggi, cosa serve e quanto pesa (S = piccolo, M = medio, L = grande).

## A. Cose da decidere o procurare prima di tutto

1. **Come compilare per iOS (L, da decidere).** Sul tuo PC Windows non si può compilare per iPhone: serve un Mac oppure la compilazione nel cloud di EAS. Oggi compiliamo tutto in locale proprio per non dipendere da EAS. Le strade sono tre:
   - EAS Build (piano a pagamento o crediti);
   - un Mac, anche usato o a noleggio nel cloud;
   - un servizio di compilazione cloud con Mac.
2. **Account Apple Developer (S).** Serve per TestFlight e per l'App Store, ed è a pagamento ogni anno. Poi bisogna creare l'app in App Store Connect con l'identificativo `com.travelsphere.app`, già scritto in `app.json`, e controllare che sia libero.
3. **Un iPhone per le prove (S, da decidere).** TestFlight si prova solo su un iPhone vero. Il simulatore va bene per le schermate, ma non per acquisti, Face ID e fotocamera.
4. **iPad sì o no (S, da decidere).** Oggi `app.json` dice `supportsTablet: true`. Con l'iPad Apple chiede anche gli screenshot iPad e controlla che l'app funzioni bene lì. Propongo `false` per la prima uscita.

## B. Acquisti (RevenueCat) – senza toccare la logica

5. **Chiave iOS di RevenueCat (S).** In `PurchaseService.ts` la chiave iOS è un segnaposto (`YOUR_IOS_KEY`). Servono:
   - l'app iOS in RevenueCat;
   - il prodotto in App Store Connect, acquisto una tantum come su Android, legato allo **stesso entitlement `premium`**;
   - la chiave vera al posto del segnaposto.
   Il resto del codice degli acquisti resta com'è.
6. **«Ripristina acquisti» (S).** Apple lo richiede, e c'è già in Impostazioni e nel paywall. Va solo provato su iPhone.
7. **Chi ha comprato su Android non ha Premium su iPhone (S).** Non c'è un account, quindi gli acquisti non passano da un negozio all'altro. Va scritto chiaro nella scheda dell'App Store, senza prezzi.

## C. Funzioni che esistono solo su Android

8. **Esportazione del backup (M).** Oggi in `SettingsScreen` si usa `StorageAccessFramework`, che esiste solo su Android: l'utente sceglie una cartella. Su iPhone la soluzione è il foglio di condivisione di sistema (`expo-sharing`, già nell'app), con «Salva su File». L'importazione con `expo-document-picker` funziona già anche su iOS.
9. **Pulsante «Esci» (S).** `BackHandler.exitApp()` su iPhone non fa niente, e Apple non accetta app con un pulsante per uscire. Su iOS va nascosto.
10. **Pulsante «Su TV» (S).** Apre le impostazioni di trasmissione di Android (`Linking.sendIntent`). Su iPhone non esiste, perché AirPlay si attiva dal Centro di controllo. Su iOS va nascosto.
11. **Barra di navigazione nascosta (S).** `expo-navigation-bar` è solo Android ed è già dentro un controllo `Platform.OS === 'android'`: su iPhone non fa niente. Va solo verificato.
12. **Rotazione (S).** `expo-screen-orientation` funziona anche su iOS. Dopo la 1.4.0 tutte le finestre dichiarano entrambi gli orientamenti, cosa che su iPhone è obbligatoria: senza, restano solo in verticale.

## D. Globo (WebView) su iPhone

13. **Il globo 3D su iPhone (M).** Su iPhone la WebView è WKWebView: WebGL funziona, ma va provato su un telefono vero. Da controllare:
    - memoria sui modelli vecchi (iPhone con 3 GB);
    - fluidità;
    - il tocco sui paesi (la funzione «Aggiungi un viaggio qui»);
    - il caricamento dei file locali del globo (oggi con `baseUrl: https://unpkg.com`, che su iOS va verificato).

    Se serve, c'è il ripiego del caricamento da file con `allowFileAccess`.
14. **Velocità di partenza (S).** Il globo impiega qualche secondo a disegnarsi, ed è lì che si vede la scritta «177 countries. rendering...», tolta nella 1.3.1. Su iPhone va misurato.

## E. Testi dei permessi (Info.plist) in 8 lingue

15. **Testi dei permessi oggi solo in inglese (M).** In `app.json` ci sono 3 testi:
    - fotocamera;
    - foto;
    - posizione.

    Vanno messi nelle 8 lingue, con la configurazione `locales` di Expo e un file per lingua, con zh/ja da far rivedere.
16. **Permesso della posizione (S).** L'app non usa il GPS: i luoghi si cercano per nome. Il testo `NSLocationWhenInUseUsageDescription` va tolto, perché Apple potrebbe chiedere a cosa serve.
17. **Permessi che mancano (S).** Vanno aggiunti, nelle 8 lingue:
    - **Face ID** (`NSFaceIDUsageDescription`), per il blocco con l'impronta: su iPhone senza questo testo l'app si chiude quando lo usa;
    - **microfono** (`NSMicrophoneUsageDescription`), perché il modulo del viaggio permette anche i video dalla fotocamera.
18. **Manifesto della privacy (S).** Oggi `NSPrivacyAccessedAPITypes` è dentro `infoPlist`, ma Expo lo vuole in `ios.privacyManifests`. Va spostato, altrimenti Apple lo considera mancante.
19. **Crittografia (S).** `ITSAppUsesNonExemptEncryption: false` in `infoPlist`, così TestFlight non chiede ogni volta la dichiarazione.

## F. Compilazione, profili e TestFlight

20. **Profili EAS per iOS (S).** `eas.json` oggi ha solo Android. Servono i profili `preview` (TestFlight) e `production` per iOS, con certificati e profili gestiti da EAS.
21. **TestFlight (S).** Prima prova interna su TestFlight, con te come tester; poi la revisione Apple.
22. **expo-av (M, vale anche per Android).** Video nel diario e a schermo intero usano `expo-av`, che Expo sta sostituendo con `expo-video`. Conviene cambiarlo prima di iOS, in un rilascio a parte, con prova dei video su entrambi i telefoni.

## G. La card e il QR

23. **QR che porta al negozio giusto (M).** Oggi il QR della card porta al Play Store (`shareLink.ts`). Con iOS serve una piccola pagina web, per esempio su GitHub Pages, che manda al Play Store o all'App Store in base al telefono di chi inquadra, conservando i parametri `utm_*`. Nell'app non c'è nessuna chiamata di rete nuova: la pagina la apre solo chi inquadra il QR.
24. **«Solo Android» (S).** Basta mettere `ANDROID_ONLY = false` in `shareLink.ts`: la scritta sparisce dalla card. Va fatto insieme al punto 23.

## H. Scheda dell'App Store

25. **Scheda in 8 lingue (M).** Titolo, sottotitolo, parole chiave (campo unico di 100 caratteri, diverso da Google), descrizione, note di rilascio. Niente prezzi, come sul Play Store.
26. **Screenshot iPhone (M).** Le misure richieste sono 6,9" e 6,5", in verticale. Si fanno dopo la 1.4.0, insieme a quelli verticali per Google.
27. **Privacy nell'App Store (S).** L'etichetta deve dire «Nessun dato raccolto». Da verificare cosa dichiara RevenueCat per gli acquisti, perché Apple potrebbe chiedere di indicare gli «acquisti».

## Stima grossolana

Senza contare i tempi di Apple (account, revisione):

| | Giorni |
|---|---|
| Lavoro sul codice (punti 5, 8-19, 23-24) | circa 6-8 |
| Compilazione e TestFlight (punti 1-3, 20-21) | 2-3 |
| Scheda e screenshot (punti 25-27) | 2-3 |
| expo-video (punto 22), se fatto prima | +2 |

## Cosa mi serve da te, quando arriveremo a iOS

1. Come compilare: EAS a pagamento, Mac o servizio cloud.
2. Se hai, o puoi avere, un iPhone per le prove.
3. iPad sì o no alla prima uscita.
