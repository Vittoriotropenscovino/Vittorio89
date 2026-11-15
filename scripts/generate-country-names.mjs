// Genera src/i18n/countryNames.ts: i nomi dei paesi nelle 8 lingue dell'app e i nomi
// alternativi usati per riconoscere un paese scritto a parole (viaggi vecchi senza codice).
// Si lancia a mano, solo sul PC di sviluppo, quando cambia l'elenco dei codici:
//   node scripts/generate-country-names.mjs
// Usa i dati CLDR che Node porta con sé (Intl.DisplayNames). Nell'app non c'è
// Intl.DisplayNames (Hermes), per questo i nomi finiscono in una tabella fissa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt', 'zh', 'ja'];

// Tutti i codici che l'app conosce: quelli della tabella dei continenti (paesi e territori).
const continentsSrc = fs.readFileSync(path.join(root, 'src/utils/countryContinents.ts'), 'utf8');
const body = continentsSrc.slice(continentsSrc.indexOf('BY_CONTINENT'), continentsSrc.indexOf('ISO2_TO_CONTINENT'));
const codes = [...new Set([...body.matchAll(/'([A-Z]{2})'/g)].map((m) => m[1]))].sort();

// Nomi CLDR poco adatti a un elenco di paesi: li sostituisco (stesso ordine di LANGS).
const DISPLAY_OVERRIDES = {
    CD: ['Repubblica Democratica del Congo', 'DR Congo', 'República Democrática del Congo', 'République démocratique du Congo', 'Demokratische Republik Kongo', 'República Democrática do Congo', null, null],
    CG: ['Repubblica del Congo', 'Republic of the Congo', 'República del Congo', 'République du Congo', 'Republik Kongo', 'República do Congo', null, null],
    PS: ['Palestina', 'Palestine', 'Palestina', 'Palestine', 'Palästina', 'Palestina', '巴勒斯坦', 'パレスチナ'],
    VA: [null, null, null, 'Cité du Vatican', null, null, null, null],
    HK: ['Hong Kong', 'Hong Kong', 'Hong Kong', 'Hong Kong', 'Hongkong', 'Hong Kong', '香港', '香港'],
    MO: ['Macao', 'Macao', 'Macao', 'Macao', 'Macau', 'Macau', '澳门', 'マカオ'],
};

// Nomi alternativi (nomi lunghi dei geocoder, sigle, vecchi nomi, nomi locali comuni).
const EXTRA_ALIASES = {
    US: ['USA', 'U.S.A.', 'US', 'U.S.', 'United States of America', "Stati Uniti d'America", 'Estados Unidos de América', "États-Unis d'Amérique", 'Vereinigte Staaten von Amerika', 'Estados Unidos da América', 'America', 'アメリカ', '美利坚合众国'],
    GB: ['UK', 'U.K.', 'Great Britain', 'Gran Bretagna', 'Britain', 'England', 'Inghilterra', 'Scotland', 'Scozia', 'Wales', 'Galles', 'Northern Ireland', 'Irlanda del Nord', 'Inglaterra', 'Escocia', 'Angleterre', 'Écosse', 'England', 'Großbritannien', 'Grã-Bretanha', 'Gran Bretaña', 'Grande-Bretagne', '英國', '英格兰', 'イングランド'],
    CD: ['Congo - Kinshasa', 'Congo-Kinshasa', 'Democratic Republic of the Congo', 'RDC', 'DRC', 'Zaire'],
    CG: ['Congo - Brazzaville', 'Congo-Brazzaville', 'Congo'],
    CZ: ['Czech Republic', 'Repubblica Ceca', 'República Checa', 'République tchèque', 'Tschechische Republik', 'República Tcheca', 'Česko', 'Česká republika'],
    NL: ['Holland', 'Olanda', 'Holanda', 'Hollande', 'Nederland'],
    KR: ['Republic of Korea', 'Korea', 'Corea', 'Corée', 'Coreia', '대한민국', '한국'],
    KP: ["Democratic People's Republic of Korea"],
    MK: ['Macedonia', 'Macedonia (FYROM)', 'Macédoine', 'Mazedonien', 'Macedônia', 'Северна Македонија'],
    SZ: ['Swaziland', 'Swasiland', 'Suazilandia', 'Swazilândia'],
    CI: ["Côte d'Ivoire", 'Cote dIvoire', 'Ivory Coast', "Costa d'Avorio", 'Elfenbeinküste', 'Costa de Marfil'],
    MM: ['Myanmar', 'Burma', 'Birmania', 'Birmanie', 'Birma', 'Birmânia', 'Mianmar'],
    TL: ['East Timor', 'Timor Est', 'Osttimor', 'Timor Oriental', 'Timor-Leste'],
    CV: ['Cabo Verde', 'Cape Verde', 'Kap Verde'],
    VA: ['Vaticano', 'Vatican', 'Holy See', 'Santa Sede', 'Saint-Siège', 'Heiliger Stuhl', 'Vatikan', 'Città del Vaticano', 'État de la Cité du Vatican', 'Stato della Città del Vaticano'],
    PS: ['Palestinian Territories', 'Palestinian Territory', 'Territori Palestinesi', 'Stato di Palestina', 'State of Palestine', 'Territorios Palestinos', 'Territoires palestiniens', 'Palästinensische Autonomiegebiete', 'Territórios palestinos', '巴勒斯坦领土', 'パレスチナ自治区', 'فلسطين'],
    TW: ['台灣', '中華民國', 'Republic of China', 'Taiwan (Province of China)'],
    XK: ['Kosova', 'Kosovë', 'Косово', 'Republic of Kosovo'],
    RU: ['Russian Federation', 'Federazione Russa', 'Federación de Rusia', 'Fédération de Russie', 'Russische Föderation', 'Federação Russa'],
    IR: ['Islamic Republic of Iran', 'Persia'],
    SY: ['Syrian Arab Republic'],
    LA: ["Lao People's Democratic Republic", 'Lao PDR'],
    VN: ['Viet Nam', 'Việt Nam'],
    BO: ['Plurinational State of Bolivia'],
    TZ: ['United Republic of Tanzania'],
    MD: ['Republic of Moldova', 'Moldavia', 'Moldavie', 'Moldau'],
    FM: ['Federated States of Micronesia', 'Stati Federati di Micronesia'],
    AE: ['UAE', 'EAU', 'Emirati', 'Emirates', 'VAE'],
    BA: ['Bosnia and Herzegovina', 'Bosnia-Erzegovina', 'Bosnia', 'Bosna i Hercegovina'],
    TR: ['Turkey', 'Türkiye', 'Turchia'],
    DE: ['Germania', 'Deutschland'],
    CH: ['Suisse', 'Svizzera', 'Svizra', 'Schweiz'],
    BE: ['Belgique', 'Belgien', 'België'],
    AT: ['Österreich'],
    ES: ['España'],
    HR: ['Hrvatska'],
    HU: ['Magyarország'],
    PL: ['Polska'],
    SK: ['Slovensko'],
    SI: ['Slovenija'],
    NO: ['Norge'],
    SE: ['Sverige'],
    DK: ['Danmark'],
    FI: ['Suomi'],
    IS: ['Ísland'],
    IE: ['Éire', 'Republic of Ireland'],
    AL: ['Shqipëria'],
    RS: ['Srbija', 'Србија'],
    ME: ['Crna Gora', 'Црна Гора'],
    RO: ['România'],
    GR: ['Ελλάδα', 'Hellas'],
    JP: ['Nippon', 'Nihon'],
    BR: ['Brasil'],
    MX: ['México'],
    PE: ['Perú'],
    PA: ['Panamá'],
    EG: ['Misr'],
    MA: ['Maroc'],
    TN: ['Tunisie'],
    DZ: ['Algérie'],
    VC: ['Saint Vincent and the Grenadines', 'Saint Vincent e Grenadine'],
    KN: ['Saint Kitts and Nevis'],
    AG: ['Antigua and Barbuda'],
    TT: ['Trinidad and Tobago'],
    ST: ['Sao Tome and Principe'],
    HK: ['Hong Kong SAR China', 'Hong Kong SAR', 'RAS di Hong Kong'],
    MO: ['Macao SAR China', 'Macau SAR', 'RAS di Macao'],
};

const dn = Object.fromEntries(LANGS.map((l) => [l, new Intl.DisplayNames([l], { type: 'region' })]));
const names = {};
const aliases = {};
for (const code of codes) {
    const row = LANGS.map((l, i) => DISPLAY_OVERRIDES[code]?.[i] ?? dn[l].of(code));
    if (row.some((n) => !n || n === code)) throw new Error(`nome mancante per ${code}: ${row}`);
    names[code] = row;
    const extra = new Set(EXTRA_ALIASES[code] || []);
    // Il nome nella lingua del paese (es. Deutschland, 日本, Россия), dai dati CLDR.
    try {
        const lang = new Intl.Locale('und-' + code).maximize().language;
        const local = new Intl.DisplayNames([lang], { type: 'region' }).of(code);
        if (local && local !== code) extra.add(local);
    } catch { /* lingua sconosciuta: niente nome locale */ }
    // I nomi CLDR che ho sostituito restano riconoscibili.
    if (DISPLAY_OVERRIDES[code]) LANGS.forEach((l) => extra.add(dn[l].of(code)));
    for (const n of row) extra.delete(n);
    if (extra.size) aliases[code] = [...extra];
}

const q = (s) => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
const lines = [
    '// GENERATO da scripts/generate-country-names.mjs: non modificare a mano.',
    '// Nomi dei paesi e territori nelle 8 lingue dell\'app (dati CLDR/Unicode),',
    '// nell\'ordine di COUNTRY_NAME_LANGS. Servono perché Hermes non ha Intl.DisplayNames.',
    '',
    "export const COUNTRY_NAME_LANGS = ['it', 'en', 'es', 'fr', 'de', 'pt', 'zh', 'ja'] as const;",
    '',
    'export const COUNTRY_NAMES: Record<string, readonly string[]> = {',
    ...codes.map((c) => `    ${c}: [${names[c].map(q).join(', ')}],`),
    '};',
    '',
    '// Altri nomi con cui un paese può comparire in un viaggio salvato (nome locale,',
    '// forme lunghe dei geocoder, sigle). Servono solo a riconoscerlo, non si mostrano.',
    'export const COUNTRY_ALIASES: Record<string, readonly string[]> = {',
    ...Object.keys(aliases).sort().map((c) => `    ${c}: [${aliases[c].map(q).join(', ')}],`),
    '};',
    '',
];
const out = path.join(root, 'src/i18n/countryNames.ts');
fs.writeFileSync(out, lines.join('\n'), 'utf8');
console.log(`scritto ${path.relative(root, out)}: ${codes.length} codici, ${Object.keys(aliases).length} con nomi alternativi (Node ${process.versions.node}, ICU ${process.versions.icu})`);
