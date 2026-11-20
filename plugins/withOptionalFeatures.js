// Dichiara FACOLTATIVE le funzioni hardware che Android deduce da solo:
//   - schermo orizzontale/verticale (dagli orientamenti delle attivita'),
//   - Wi-Fi (dal permesso ACCESS_WIFI_STATE di @react-native-community/netinfo).
// Senza queste righe Google le tratta come richieste e l'app non si vede su Chromebook,
// visori Android XR e alcuni tablet (avviso di Play Console, novembre 2026).
// Non e' un permesso e non cambia niente per chi ha gia' l'app.
// La build locale fa lo stesso con android/sincronizza-manifest.mjs (android/ e' fuori da git).
const { withAndroidManifest } = require('expo/config-plugins');

const FUNZIONI = ['android.hardware.screen.portrait', 'android.hardware.screen.landscape', 'android.hardware.wifi'];

module.exports = function withOptionalFeatures(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const lista = manifest['uses-feature'] || [];
    for (const nome of FUNZIONI) {
      const gia = lista.find((f) => f.$ && f.$['android:name'] === nome);
      if (gia) gia.$['android:required'] = 'false';
      else lista.push({ $: { 'android:name': nome, 'android:required': 'false' } });
    }
    manifest['uses-feature'] = lista;
    return c;
  });
};
