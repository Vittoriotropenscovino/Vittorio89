// Genera src/utils/countryCoordinates.ts: un punto (lat, lng) per ognuno dei 197 paesi.
// Serve a far girare il globo verso i paesi segnati e a disegnare un punto luminoso
// sui piccoli stati che la mappa 110m non disegna (Malta, San Marino, Singapore…).
// Si lancia a mano sul PC di sviluppo: node scripts/generate-country-coordinates.mjs
// - paesi con la forma sul globo: baricentro sferico (d3-geo) del poligono più grande,
//   così la Francia cade in Europa e non a metà strada con la Guyana;
// - paesi senza forma: coordinate della capitale (tabella SMALL qui sotto).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { geoArea, geoCentroid } from 'd3-geo';

const require = createRequire(import.meta.url);
const topojson = require('topojson-client');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const html = fs.readFileSync(path.join(root, 'assets/globe.html'), 'utf8');
const isoToNumeric = Object.fromEntries(
    [...html.match(/var _isoToNumeric=\{([^}]*)\}/)[1].matchAll(/([A-Z]{2}):'(\d+)'/g)].map((m) => [m[1], m[2]])
);
const countriesSrc = fs.readFileSync(path.join(root, 'src/utils/countries.ts'), 'utf8');
const world = [...countriesSrc
    .slice(countriesSrc.indexOf('WORLD_COUNTRIES'), countriesSrc.indexOf('WORLD_COUNTRY_COUNT'))
    .matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]);

const topo = JSON.parse(fs.readFileSync(path.join(root, 'assets/vendor/countries-110m.txt'), 'utf8'));
const features = topojson.feature(topo, topo.objects.countries).features;
const byId = new Map(features.filter((f) => f.id).map((f) => [String(f.id), f]));
const kosovo = features.find((f) => !f.id && f.properties?.name === 'Kosovo');

// Capitali dei paesi che a 110m non hanno forma (lat, lng).
const SMALL = {
    AD: [42.51, 1.52], AG: [17.12, -61.85], BH: [26.22, 50.59], BB: [13.1, -59.62],
    CV: [14.93, -23.51], KM: [-11.7, 43.26], DM: [15.3, -61.39], GD: [12.06, -61.75],
    KI: [1.33, 172.98], LI: [47.14, 9.52], MV: [4.18, 73.51], MT: [35.9, 14.51],
    MH: [7.09, 171.38], MU: [-20.16, 57.5], FM: [6.92, 158.16], MC: [43.74, 7.42],
    NR: [-0.55, 166.92], PW: [7.5, 134.62], KN: [17.3, -62.72], LC: [14.01, -60.99],
    VC: [13.16, -61.22], WS: [-13.83, -171.76], SM: [43.94, 12.45], ST: [0.34, 6.73],
    SC: [-4.62, 55.45], SG: [1.35, 103.82], TO: [-21.14, -175.2], TV: [-8.52, 179.2],
    VA: [41.9, 12.45],
};

const largestPolygon = (feature) => {
    if (feature.geometry.type !== 'MultiPolygon') return feature;
    let best = null;
    let bestArea = -1;
    for (const coords of feature.geometry.coordinates) {
        const poly = { type: 'Feature', geometry: { type: 'Polygon', coordinates: coords } };
        const area = geoArea(poly);
        if (area > bestArea) { bestArea = area; best = poly; }
    }
    return best;
};

const round = (n) => Math.round(n * 100) / 100;
const rows = [];
const small = [];
for (const code of world) {
    const feature = code === 'XK' ? kosovo : byId.get(isoToNumeric[code]);
    if (feature) {
        const [lng, lat] = geoCentroid(largestPolygon(feature));
        rows.push([code, round(lat), round(lng)]);
    } else if (SMALL[code]) {
        rows.push([code, ...SMALL[code]]);
        small.push(code);
    } else {
        throw new Error(`nessuna coordinata per ${code}`);
    }
}

const out = [
    '// GENERATO da scripts/generate-country-coordinates.mjs: non modificare a mano.',
    '// Un punto [lat, lng] per paese: baricentro della parte principale, oppure la',
    '// capitale per i piccoli stati che il globo (mappa 110m) non disegna.',
    '',
    'export const COUNTRY_POINTS: Record<string, readonly [number, number]> = {',
    ...rows.map(([c, lat, lng]) => `    ${c}: [${lat}, ${lng}],`),
    '};',
    '',
    '/** Paesi che sul globo non hanno una forma: si accendono con un punto luminoso. */',
    `export const COUNTRIES_WITHOUT_SHAPE: readonly string[] = [${small.map((c) => `'${c}'`).join(', ')}];`,
    '',
];
const file = path.join(root, 'src/utils/countryCoordinates.ts');
fs.writeFileSync(file, out.join('\n'), 'utf8');
console.log(`scritto ${path.relative(root, file)}: ${rows.length} paesi, ${small.length} senza forma`);
