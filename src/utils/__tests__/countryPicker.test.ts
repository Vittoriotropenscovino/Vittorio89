import {
    buildCountrySections, matchesQuery, countryCounterText, globeTargetFor, shapelessCountryPoints, CONTINENT_ORDER,
} from '../countryPicker';
import { COUNTRY_POINTS, COUNTRIES_WITHOUT_SHAPE } from '../countryCoordinates';
import { WORLD_COUNTRIES } from '../countries';
import { translations } from '../../i18n/translations';

const none = new Set<string>();
const tIt = (key: string) => (translations.it as Record<string, string | string[]>)[key] ?? key;
const tEn = (key: string) => (translations.en as Record<string, string | string[]>)[key] ?? key;

describe('buildCountrySections', () => {
    it('lists all 197 countries in 6 continents, Europe first', () => {
        const sections = buildCountrySections('it', '', none, none);
        expect(sections.map((s) => s.continent)).toEqual(CONTINENT_ORDER.map((c) => c.continent));
        expect(sections[0].continent).toBe('Europe');
        expect(sections.reduce((n, s) => n + s.data.length, 0)).toBe(197);
        expect(sections.reduce((n, s) => n + s.total, 0)).toBe(197);
    });

    it('names follow the app language and are sorted', () => {
        const europe = buildCountrySections('it', '', none, none)[0];
        const names = europe.data.map((r) => r.name);
        expect(names).toContain('Germania');
        expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'it')));
        const europeJa = buildCountrySections('ja', '', none, none)[0];
        expect(europeJa.data.map((r) => r.name)).toContain('ドイツ');
    });

    it('a country from the diary is on and locked even if not marked', () => {
        const sections = buildCountrySections('it', '', new Set(['FR']), new Set(['IT', 'FR']));
        const europe = sections[0];
        const state = (code: string) => europe.data.find((r) => r.code === code)?.state;
        expect(state('IT')).toBe('diary');
        expect(state('FR')).toBe('diary');   // diary wins over marked
        expect(state('ES')).toBe('off');
        expect(europe.visited).toBe(2);
    });

    it('counts visited per continent, also while searching', () => {
        const sections = buildCountrySections('it', 'giap', new Set(['IT', 'JP']), none);
        expect(sections).toHaveLength(1);
        expect(sections[0].continent).toBe('Asia');
        expect(sections[0].data.map((r) => r.code)).toEqual(['JP']);
        expect(sections[0].visited).toBe(1);
    });
});

describe('search ignores accents and case, and knows other names', () => {
    it.each([
        ['germania', 'DE'], ['GERMANIA', 'DE'], ['deutschland', 'DE'], ['germany', 'DE'],
        ['usa', 'US'], ['stati uniti', 'US'], ['cote', 'CI'], ['côte', 'CI'], ['mexico', 'MX'],
        ['turchia', 'TR'], ['türkiye', 'TR'], ['イタリア', 'IT'], ['意大利', 'IT'], ['ital', 'IT'],
    ])('"%s" finds %s', (query, code) => {
        expect(matchesQuery(code, 'it', query)).toBe(true);
    });

    it('does not find unrelated countries', () => {
        expect(matchesQuery('FR', 'it', 'germania')).toBe(false);
        expect(buildCountrySections('it', 'zzzz', none, none)).toEqual([]);
    });
});

describe('countryCounterText', () => {
    it('says "1 paese" and "12 paesi" with the % of the world', () => {
        expect(countryCounterText(tIt, 1)).toBe('1 paese · 1% del mondo');
        expect(countryCounterText(tIt, 12)).toBe('12 paesi · 6% del mondo');
        expect(countryCounterText(tIt, 0)).toBe('0 paesi · 0% del mondo');
        expect(countryCounterText(tEn, 20)).toBe('20 countries · 10% of the world');
    });
});

describe('globeTargetFor', () => {
    it('turns to the country when only one is lit', () => {
        expect(globeTargetFor(['IT'])).toEqual({ latitude: COUNTRY_POINTS.IT[0], longitude: COUNTRY_POINTS.IT[1] });
    });

    it('turns between neighbours', () => {
        const target = globeTargetFor(['IT', 'FR', 'ES'])!;
        expect(target.latitude).toBeGreaterThan(38);
        expect(target.latitude).toBeLessThan(48);
        expect(target.longitude).toBeGreaterThan(-5);
        expect(target.longitude).toBeLessThan(14);
    });

    it('countries on opposite sides cancel out: the last one wins', () => {
        const target = globeTargetFor(['EC', 'ID'])!; // Ecuador and Indonesia, ~180° apart
        expect(target).toEqual({ latitude: COUNTRY_POINTS.ID[0], longitude: COUNTRY_POINTS.ID[1] });
    });

    it('has nothing to show for no country', () => {
        expect(globeTargetFor([])).toBeNull();
        expect(globeTargetFor(['ZZ'])).toBeNull();
    });
});

describe('country points', () => {
    it('every country of the list has a point on the globe', () => {
        for (const code of WORLD_COUNTRIES) {
            const point = COUNTRY_POINTS[code];
            expect(point).toBeDefined();
            expect(Math.abs(point[0])).toBeLessThanOrEqual(90);
            expect(Math.abs(point[1])).toBeLessThanOrEqual(180);
        }
    });

    it('the countries without a shape on the map are the small states', () => {
        expect(COUNTRIES_WITHOUT_SHAPE).toHaveLength(29);
        expect(COUNTRIES_WITHOUT_SHAPE).toEqual(expect.arrayContaining(['MT', 'SM', 'VA', 'SG', 'MC', 'AD', 'MV']));
        expect(COUNTRIES_WITHOUT_SHAPE).not.toContain('IT');
        expect(COUNTRIES_WITHOUT_SHAPE).not.toContain('XK'); // Kosovo has its shape (id 926)
    });

    it('only small states get a glowing dot', () => {
        expect(shapelessCountryPoints(['IT', 'MT', 'SM'])).toEqual({ MT: COUNTRY_POINTS.MT, SM: COUNTRY_POINTS.SM });
        expect(shapelessCountryPoints([])).toEqual({});
    });
});
