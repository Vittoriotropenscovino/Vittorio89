// Genera src/utils/countryShapes.ts: le forme dei paesi per la mappa delle card
// (planisfero o globo disegnati con react-native-svg, niente WebView).
// Stessa mappa 110m del globo dell'app (assets/vendor/countries-110m.txt).
// Si lancia a mano sul PC di sviluppo: node scripts/generate-country-shapes.mjs
// - ogni forma ha il codice ISO alpha-2 se il paese e' nella lista dei 197,
//   altrimenti '' (terra disegnata ma mai accesa: Groenlandia, Sahara Occ., ...);
// - l'Antartide resta fuori (nessuno la segna e ruberebbe spazio alla mappa);
// - coordinate in decimi di grado, anello per anello: "lng,lat,lng,lat,..."
//   con gli anelli separati da uno spazio.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const topojson = require('topojson-client');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const html = fs.readFileSync(path.join(root, 'assets/globe.html'), 'utf8');
const numericToIso = Object.fromEntries(
    [...html.match(/var _isoToNumeric=\{([^}]*)\}/)[1].matchAll(/([A-Z]{2}):'(\d+)'/g)].map((m) => [m[2], m[1]])
);
const countriesSrc = fs.readFileSync(path.join(root, 'src/utils/countries.ts'), 'utf8');
const world = new Set([...countriesSrc
    .slice(countriesSrc.indexOf('WORLD_COUNTRIES'), countriesSrc.indexOf('WORLD_COUNTRY_COUNT'))
    .matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]));

const topo = JSON.parse(fs.readFileSync(path.join(root, 'assets/vendor/countries-110m.txt'), 'utf8'));
const features = topojson.feature(topo, topo.objects.countries).features;

const ANTARCTICA = '010';
const rows = [];
for (const f of features) {
    if (String(f.id) === ANTARCTICA) continue;
    let code = '';
    if (!f.id && f.properties?.name === 'Kosovo') code = 'XK';
    else if (f.id) code = numericToIso[String(f.id)] || '';
    if (code && !world.has(code)) code = '';
    const g = f.geometry;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const rings = [];
    for (const poly of polys) {
        for (const ring of poly) {
            const out = [];
            let last = '';
            for (const [lng, lat] of ring) {
                const p = `${Math.round(lng * 10)},${Math.round(lat * 10)}`;
                if (p !== last) out.push(p);
                last = p;
            }
            if (out.length >= 4) rings.push(out.join(','));
        }
    }
    if (rings.length) rows.push([code, rings.join(' '), f.properties?.name || '']);
}

const shaped = rows.filter(([c]) => c).map(([c]) => c);
const out = [
    '// GENERATO da scripts/generate-country-shapes.mjs: non modificare a mano.',
    '// Forme dei paesi (mappa 110m, la stessa del globo) per la mappa delle card.',
    '// [codice ISO alpha-2 o \'\' se fuori dalla lista dei 197, anelli in decimi di',
    '// grado "lng,lat,lng,lat,..." separati da uno spazio]. Antartide esclusa.',
    '',
    'export const COUNTRY_SHAPES: readonly (readonly [string, string])[] = [',
    ...rows.map(([c, r, name]) => `    ['${c}', '${r}'], // ${name.replace(/[\r\n]/g, ' ')}`),
    '];',
    '',
];
fs.writeFileSync(path.join(root, 'src/utils/countryShapes.ts'), out.join('\n'));
console.log(`${rows.length} forme, ${shaped.length} paesi della lista con forma, ${(out.join('\n').length / 1024).toFixed(0)} KB`);
const missing = [...world].filter((c) => !shaped.includes(c));
console.log(`senza forma (${missing.length}): ${missing.join(' ')}`);
