// Logic of the "Where have you been?" screen, kept out of the component so it
// can be unit-tested: sections by continent, accent-insensitive search, the live
// counter and where the globe should turn after confirming.
import { Continent, continentForCountryCode } from './countryContinents';
import { WORLD_COUNTRIES, countryName, countrySearchNames, foldText, worldPercentLabel } from './countries';
import { COUNTRIES_WITHOUT_SHAPE, COUNTRY_POINTS } from './countryCoordinates';

const SHAPELESS = new Set(COUNTRIES_WITHOUT_SHAPE);

/**
 * Points of the visited countries that the globe's map does not draw (Malta,
 * San Marino, Singapore…), so the globe can light them as a glowing dot.
 */
export const shapelessCountryPoints = (codes: readonly string[]): Record<string, readonly [number, number]> => {
    const out: Record<string, readonly [number, number]> = {};
    for (const code of codes) {
        if (SHAPELESS.has(code) && COUNTRY_POINTS[code]) out[code] = COUNTRY_POINTS[code];
    }
    return out;
};

export type CountryState = 'off' | 'marked' | 'diary';

export interface CountryRow {
    code: string;
    name: string;
    state: CountryState;
}

export interface CountrySection {
    continent: Continent;
    titleKey: string;
    /** How many countries of this continent are on (marked or from the diary). */
    visited: number;
    total: number;
    data: CountryRow[];
}

/** Order of the sections; Antarctica has no country in the list. */
export const CONTINENT_ORDER: { continent: Continent; titleKey: string }[] = [
    { continent: 'Europe', titleKey: 'continentEurope' },
    { continent: 'Asia', titleKey: 'continentAsia' },
    { continent: 'Africa', titleKey: 'continentAfrica' },
    { continent: 'North America', titleKey: 'continentNorthAmerica' },
    { continent: 'South America', titleKey: 'continentSouthAmerica' },
    { continent: 'Oceania', titleKey: 'continentOceania' },
];

const compareNames = (language: string) => {
    return (a: CountryRow, b: CountryRow) => {
        try {
            return a.name.localeCompare(b.name, language);
        } catch {
            return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
        }
    };
};

// Folded search text per language, computed once: every name the country is
// known by, so "usa", "germania" or "deutschland" all find what you mean.
const searchCache = new Map<string, Map<string, string>>();
const searchTextFor = (code: string, language: string): string => {
    let byCode = searchCache.get(language);
    if (!byCode) {
        byCode = new Map();
        searchCache.set(language, byCode);
    }
    let text = byCode.get(code);
    if (text === undefined) {
        text = [countryName(code, language), ...countrySearchNames(code)].map(foldText).join('|');
        byCode.set(code, text);
    }
    return text;
};

export const matchesQuery = (code: string, language: string, query: string): boolean => {
    const q = foldText(query);
    if (!q) return true;
    return searchTextFor(code, language).includes(q);
};

/**
 * Sections for the list. `marked` = ticked in this screen; `diary` = countries
 * that come from trips (always on, cannot be turned off here).
 */
export const buildCountrySections = (
    language: string,
    query: string,
    marked: ReadonlySet<string>,
    diary: ReadonlySet<string>,
): CountrySection[] => {
    const sort = compareNames(language);
    return CONTINENT_ORDER.map(({ continent, titleKey }) => {
        const all: CountryRow[] = WORLD_COUNTRIES
            .filter((code) => continentForCountryCode(code) === continent)
            .map((code) => ({
                code,
                name: countryName(code, language),
                state: diary.has(code) ? 'diary' : marked.has(code) ? 'marked' : 'off',
            }));
        const visited = all.filter((row) => row.state !== 'off').length;
        const data = all.filter((row) => matchesQuery(row.code, language, query)).sort(sort);
        return { continent, titleKey, visited, total: all.length, data };
    }).filter((section) => section.data.length > 0);
};

type Translate = (key: string) => string | string[];

/** "12 paesi · 6% del mondo" */
export const countryCounterText = (t: Translate, count: number): string =>
    (t(count === 1 ? 'wbCounterOne' : 'wbCounterMany') as string)
        .replace('{count}', String(count))
        .replace('{pct}', worldPercentLabel(count));

/** Countries closer than this belong to the same group on the globe. */
export const GLOBE_GROUP_KM = 2500;

const toRad = (deg: number) => (deg * Math.PI) / 180;
const distanceKm = (a: readonly [number, number], b: readonly [number, number]) => {
    const dLat = toRad(b[0] - a[0]), dLng = toRad(b[1] - a[1]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
};

/**
 * Where to turn the globe so the lit countries are in view: the biggest group
 * of them. Each country counts its neighbours within GLOBE_GROUP_KM; the one
 * with the most wins (on a tie, the later in the list, i.e. the most recently
 * marked) and the globe turns to the centre of that group. So Austria, Belarus,
 * Croatia, France + Bhutan + Palau shows Europe, never the empty ocean between.
 */
export const globeTargetFor = (codes: readonly string[]): { latitude: number; longitude: number } | null => {
    const points = codes.map((c) => COUNTRY_POINTS[c]).filter(Boolean);
    if (points.length === 0) return null;
    let group: (readonly [number, number])[] = [];
    for (const p of points) {
        const near = points.filter((q) => distanceKm(p, q) <= GLOBE_GROUP_KM);
        if (near.length >= group.length) group = near;
    }
    let x = 0, y = 0, z = 0;
    for (const [lat, lng] of group) {
        x += Math.cos(toRad(lat)) * Math.cos(toRad(lng));
        y += Math.cos(toRad(lat)) * Math.sin(toRad(lng));
        z += Math.sin(toRad(lat));
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        latitude: round((Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI),
        longitude: round((Math.atan2(y, x) * 180) / Math.PI),
    };
};
