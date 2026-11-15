// The world as TravelSphere counts it: the list of countries a user can mark,
// the denominator of "X% of the world", localized names and name → code lookup.
import { COUNTRY_ALIASES, COUNTRY_NAMES, COUNTRY_NAME_LANGS } from '../i18n/countryNames';

/**
 * The 197 countries of the "Where have you been?" list and of the % of the world:
 * the 193 UN members, the two UN observer states (Vatican City, Palestine), plus
 * Taiwan and Kosovo. Dependent territories (Greenland, Puerto Rico, Hong Kong…)
 * are not in the list, but a trip saved there still counts as a country, as it
 * always did; the percentage is capped at 100.
 */
export const WORLD_COUNTRIES: readonly string[] = [
    // UN member states (193)
    'AF', 'AL', 'DZ', 'AD', 'AO', 'AG', 'AR', 'AM', 'AU', 'AT', 'AZ', 'BS', 'BH', 'BD',
    'BB', 'BY', 'BE', 'BZ', 'BJ', 'BT', 'BO', 'BA', 'BW', 'BR', 'BN', 'BG', 'BF', 'BI',
    'CV', 'KH', 'CM', 'CA', 'CF', 'TD', 'CL', 'CN', 'CO', 'KM', 'CG', 'CD', 'CR', 'CI',
    'HR', 'CU', 'CY', 'CZ', 'DK', 'DJ', 'DM', 'DO', 'EC', 'EG', 'SV', 'GQ', 'ER', 'EE',
    'SZ', 'ET', 'FJ', 'FI', 'FR', 'GA', 'GM', 'GE', 'DE', 'GH', 'GR', 'GD', 'GT', 'GN',
    'GW', 'GY', 'HT', 'HN', 'HU', 'IS', 'IN', 'ID', 'IR', 'IQ', 'IE', 'IL', 'IT', 'JM',
    'JP', 'JO', 'KZ', 'KE', 'KI', 'KP', 'KR', 'KW', 'KG', 'LA', 'LV', 'LB', 'LS', 'LR',
    'LY', 'LI', 'LT', 'LU', 'MG', 'MW', 'MY', 'MV', 'ML', 'MT', 'MH', 'MR', 'MU', 'MX',
    'FM', 'MD', 'MC', 'MN', 'ME', 'MA', 'MZ', 'MM', 'NA', 'NR', 'NP', 'NL', 'NZ', 'NI',
    'NE', 'NG', 'MK', 'NO', 'OM', 'PK', 'PW', 'PA', 'PG', 'PY', 'PE', 'PH', 'PL', 'PT',
    'QA', 'RO', 'RU', 'RW', 'KN', 'LC', 'VC', 'WS', 'SM', 'ST', 'SA', 'SN', 'RS', 'SC',
    'SL', 'SG', 'SK', 'SI', 'SB', 'SO', 'ZA', 'SS', 'ES', 'LK', 'SD', 'SR', 'SE', 'CH',
    'SY', 'TJ', 'TZ', 'TH', 'TL', 'TG', 'TO', 'TT', 'TN', 'TR', 'TM', 'TV', 'UG', 'UA',
    'AE', 'GB', 'US', 'UY', 'UZ', 'VU', 'VE', 'VN', 'YE', 'ZM', 'ZW',
    // UN observer states
    'VA', 'PS',
    // Widely travelled, not UN members
    'TW', 'XK',
];

export const WORLD_COUNTRY_COUNT = WORLD_COUNTRIES.length;

const WORLD_SET = new Set(WORLD_COUNTRIES);
export const isWorldCountry = (code: string): boolean => WORLD_SET.has(code);

/** Share of the world visited, 0–100, rounded. Capped: territories count too. */
export const worldPercent = (countries: number): number =>
    Math.max(0, Math.min(100, Math.round((countries / WORLD_COUNTRY_COUNT) * 100)));

/** "6", or "<1" when at least one country rounds down to 0. */
export const worldPercentLabel = (countries: number): string => {
    const pct = worldPercent(countries);
    return pct === 0 && countries > 0 ? '<1' : String(pct);
};

// ─── Text folding: search and name matching ignore case and accents ───
// Hermes's String.prototype.normalize is not something to rely on, so accents
// are folded with a fixed table (Latin-1 + Latin Extended-A/B).
const FOLD_FROM = 'àáâãäåçèéêëìíîïñòóôõöùúûüýÿāăąćĉċčďēĕėęěĝğġģĥĩīĭįĵķĺļľńņňōŏőŕŗřśŝşšţťũūŭůűųŵŷźżžơưǎǐǒǔǖǘǚǜǟǡǧǩǫǭǰǵǹǻȁȃȅȇȉȋȍȏȑȓȕȗșțȟȧȩȫȭȯȱȳ';
const FOLD_TO = 'aaaaaaceeeeiiiinooooouuuuyyaaaccccdeeeeegggghiiiijklllnnnooorrrssssttuuuuuuwyzzzouaiouuuuuaagkoojgnaaaeeiioorruusthaeooooy';
const FOLD_MAP: Record<string, string> = {
    'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ø': 'o', 'ł': 'l', 'đ': 'd', 'ð': 'd',
    'þ': 'th', 'ı': 'i', 'ħ': 'h', 'ŧ': 't', 'ŋ': 'n',
};
for (let i = 0; i < FOLD_FROM.length; i++) FOLD_MAP[FOLD_FROM[i]] = FOLD_TO[i];
// Punctuation that should not tell two names apart: "Côte d’Ivoire" = "cote d ivoire".
const SEPARATORS = new Set([...' \t\n\'’‘`´.,;:()（）[]-–—_/&"“”«»・·']);

export const foldText = (text: string): string => {
    let out = '';
    for (const ch of (text || '').toLowerCase()) {
        const c = ch.charCodeAt(0);
        if (c >= 0x300 && c <= 0x36f) continue; // combining accents
        const mapped = FOLD_MAP[ch];
        out += mapped !== undefined ? mapped : SEPARATORS.has(ch) ? ' ' : ch;
    }
    return out.replace(/\s+/g, ' ').trim();
};

// ─── Localized names ───
export type CountryNameLanguage = (typeof COUNTRY_NAME_LANGS)[number];

export const countryName = (code: string, language: string): string => {
    const row = COUNTRY_NAMES[code];
    if (!row) return code;
    const i = COUNTRY_NAME_LANGS.indexOf(language as CountryNameLanguage);
    return row[i >= 0 ? i : 1];
};

/** All names a country is known by (8 languages + aliases), for search. */
export const countrySearchNames = (code: string): readonly string[] => [
    ...(COUNTRY_NAMES[code] || []),
    ...(COUNTRY_ALIASES[code] || []),
];

// ─── Name → ISO code (for old trips saved without a countryCode) ───
const withoutParentheses = (name: string) => name.replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').trim();

let nameIndex: Map<string, string | null> | null = null;

const buildNameIndex = () => {
    // null = ambiguous: two countries share that name, so never guess.
    const index = new Map<string, string | null>();
    const add = (name: string, code: string, official: boolean) => {
        for (const variant of [name, withoutParentheses(name)]) {
            const key = foldText(variant);
            if (!key) continue;
            if (!index.has(key)) index.set(key, code);
            else if (index.get(key) !== code && official) index.set(key, null);
        }
    };
    // Official names first; aliases only fill names nobody else uses.
    for (const code of Object.keys(COUNTRY_NAMES)) {
        for (const name of COUNTRY_NAMES[code]) add(name, code, true);
    }
    const officialKeys = new Set(index.keys());
    const aliasOwner = new Map<string, string | null>();
    for (const code of Object.keys(COUNTRY_ALIASES)) {
        for (const name of COUNTRY_ALIASES[code]) {
            for (const variant of [name, withoutParentheses(name)]) {
                const key = foldText(variant);
                if (!key || officialKeys.has(key)) continue;
                const owner = aliasOwner.get(key);
                aliasOwner.set(key, owner === undefined || owner === code ? code : null);
            }
        }
    }
    aliasOwner.forEach((code, key) => index.set(key, code));
    return index;
};

/** ISO code for a country name in any of the app's languages (or a known alias). */
export const countryCodeFromName = (name: string | undefined | null): string | undefined => {
    if (!name) return undefined;
    if (!nameIndex) nameIndex = buildNameIndex();
    return nameIndex.get(foldText(name)) ?? undefined;
};

// ─── Marked countries (the "Where have you been?" list) ───

/** Keeps only known ISO codes, uppercased, without duplicates, in order. */
export const sanitizeCountryCodes = (input: unknown): string[] => {
    if (!Array.isArray(input)) return [];
    const out: string[] = [];
    for (const item of input) {
        if (typeof item !== 'string') continue;
        const code = item.trim().toUpperCase();
        if (/^[A-Z]{2}$/.test(code) && COUNTRY_NAMES[code] && !out.includes(code)) out.push(code);
    }
    return out;
};

/** Union of two marked lists: existing order kept, new codes appended. */
export const mergeCountryCodes = (existing: readonly string[], incoming: readonly string[]) => {
    const merged = sanitizeCountryCodes([...existing, ...incoming]);
    return { merged, added: merged.length - sanitizeCountryCodes(existing).length };
};
