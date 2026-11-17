import { WORLD_COUNTRIES } from '../countries';
import { COUNTRIES_WITHOUT_SHAPE } from '../countryCoordinates';
import { COUNTRY_SHAPES } from '../countryShapes';
import {
    chooseGlobeCenter, flatWorldMap, globeWorldMap, hasShape, hiddenOnGlobe, naturalEarth, DEFAULT_GLOBE_CENTER,
} from '../worldMap';

const numbersOf = (d: string): number[] => (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);

describe('country shapes', () => {
    it('every one of the 197 countries has a shape or is a small state drawn as a dot', () => {
        const shaped = WORLD_COUNTRIES.filter(hasShape);
        expect(shaped.length + COUNTRIES_WITHOUT_SHAPE.length).toBe(197);
        for (const code of COUNTRIES_WITHOUT_SHAPE) expect(hasShape(code)).toBe(false);
    });

    it('only codes of the 197 list can light up; Antarctica is not drawn', () => {
        for (const [code] of COUNTRY_SHAPES) if (code) expect(WORLD_COUNTRIES).toContain(code);
        expect(COUNTRY_SHAPES.some(([code]) => code === 'AQ')).toBe(false);
    });

    it('Kosovo has its own shape (the 110m map ships it without an id)', () => {
        expect(hasShape('XK')).toBe(true);
    });
});

describe('flat world map', () => {
    it('Natural Earth: the centre is the origin, east is right, north is up', () => {
        expect(naturalEarth(0, 0)).toEqual([0, 0]);
        expect(naturalEarth(90, 0)[0]).toBeGreaterThan(0);
        expect(naturalEarth(0, 45)[1]).toBeGreaterThan(0);
    });

    it('one country: only it is gold, the rest is land, no broken numbers', () => {
        const m = flatWorldMap({ gold: ['IT'] });
        expect(m.width).toBe(1000);
        expect(m.height).toBeGreaterThan(400);
        expect(m.height).toBeLessThan(560);
        expect(m.gold.length).toBeGreaterThan(20);
        expect(m.land.length).toBeGreaterThan(m.gold.length * 20);
        expect(m.dim).toBe('');
        expect(m.land).not.toMatch(/NaN|Infinity/);
        for (const n of numbersOf(m.gold)) {
            expect(n).toBeGreaterThanOrEqual(0);
            expect(n).toBeLessThanOrEqual(1000);
        }
    });

    it('Russia and Fiji across the 180° line: no line across the map, drawn on both edges', () => {
        const m = flatWorldMap({ gold: ['RU', 'FJ'] });
        const nums = numbersOf(m.gold);
        // Every segment is short: nothing jumps from one edge of the map to the other.
        const paths = m.gold.split('M').filter(Boolean).map(numbersOf);
        for (const p of paths) {
            for (let i = 2; i < p.length; i += 2) expect(Math.abs(p[i] - p[i - 2])).toBeLessThan(500);
        }
        expect(Math.max(...nums.filter((_, i) => i % 2 === 0))).toBeGreaterThan(990);
    });

    it('globe: a country on the rim is clipped, not smeared along the edge', () => {
        // Brazil seen from above Europe: only a sliver near the rim.
        const m = globeWorldMap({ gold: ['BR'] }, { lng: 10, lat: 45 });
        const { cx, cy } = m.globe!;
        const nums = numbersOf(m.gold);
        // Everything, rim stretch included, stays in the lower-left quarter.
        const xs = nums.filter((_, i) => i % 2 === 0);
        const ys = nums.filter((_, i) => i % 2 === 1);
        expect(Math.max(...xs)).toBeLessThan(cx);
        expect(Math.min(...ys)).toBeGreaterThan(cy);
    });

    it('Italy sits in Europe: right of the middle, upper half', () => {
        const nums = numbersOf(flatWorldMap({ gold: ['IT'] }).gold);
        const xs = nums.filter((_, i) => i % 2 === 0);
        const ys = nums.filter((_, i) => i % 2 === 1);
        const m = flatWorldMap({ gold: ['IT'] });
        expect(Math.min(...xs)).toBeGreaterThan(500);
        expect(Math.max(...xs)).toBeLessThan(600);
        expect(Math.max(...ys)).toBeLessThan(m.height / 2);
    });

    it('a small state without a shape becomes a gold dot', () => {
        const m = flatWorldMap({ gold: ['MT', 'SG'] });
        expect(m.gold).toBe('');
        expect(m.dots).toHaveLength(2);
        expect(m.dots.every((d) => d.tone === 'gold')).toBe(true);
    });

    it('a visited country too small to see also gets a dot (Luxembourg)', () => {
        const m = flatWorldMap({ gold: ['LU'] });
        expect(m.gold.length).toBeGreaterThan(0);
        expect(m.dots).toHaveLength(1);
    });

    it('year recap: year countries gold, the other visited ones muted, never both', () => {
        const m = flatWorldMap({ gold: ['JP', 'PE'], dim: ['IT', 'JP', 'MT'] });
        expect(m.gold.length).toBeGreaterThan(0);
        expect(m.dim.length).toBeGreaterThan(0);
        expect(m.dots).toEqual([expect.objectContaining({ tone: 'dim' })]); // Malta
        expect(flatWorldMap({ gold: ['JP'], dim: ['JP'] }).dim).toBe('');
    });
});

describe('globe', () => {
    it('no country: Europe and Africa in front', () => {
        expect(chooseGlobeCenter([])).toEqual(DEFAULT_GLOBE_CENTER);
    });

    it('European trips: centred on Europe', () => {
        const c = chooseGlobeCenter(['IT', 'FR', 'ES', 'DE', 'GR']);
        expect(c.lng).toBeGreaterThan(0);
        expect(c.lng).toBeLessThan(25);
        expect(c.lat).toBeGreaterThan(35);
        expect(c.lat).toBeLessThanOrEqual(45);
    });

    it('the largest group wins: 5 in Europe and Japan → Europe, Japan on the hidden side', () => {
        const codes = ['IT', 'FR', 'ES', 'DE', 'GR', 'JP'];
        const c = chooseGlobeCenter(codes);
        expect(c.lng).toBeLessThan(40);
        expect(hiddenOnGlobe(codes, c)).toEqual(['JP']);
    });

    it('the view never comes from the poles', () => {
        expect(chooseGlobeCenter(['IS', 'NO', 'FI']).lat).toBeLessThanOrEqual(45);
        expect(chooseGlobeCenter(['AR', 'CL', 'NZ']).lat).toBeGreaterThanOrEqual(-40);
    });

    it('everything is drawn inside the sphere, nothing broken', () => {
        const m = globeWorldMap({ gold: ['IT', 'BR', 'JP', 'AU', 'US'] });
        const { cx, cy, r } = m.globe!;
        for (const d of [m.land, m.gold]) {
            expect(d).not.toMatch(/NaN|Infinity/);
            const nums = numbersOf(d);
            for (let i = 0; i < nums.length; i += 2) {
                expect(Math.hypot(nums[i] - cx, nums[i + 1] - cy)).toBeLessThanOrEqual(r + 0.2);
            }
        }
    });

    it('a country fully on the hidden side is not drawn and is listed as hidden', () => {
        const m = globeWorldMap({ gold: ['NZ'] }, { lng: 12, lat: 42 });
        expect(m.gold).toBe('');
        expect(m.hidden).toEqual(['NZ']);
    });

    it('one country: it is in front, in the middle', () => {
        const m = globeWorldMap({ gold: ['IT'] });
        expect(m.hidden).toEqual([]);
        const nums = numbersOf(m.gold);
        const xs = nums.filter((_, i) => i % 2 === 0);
        const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
        expect(Math.abs(mid - m.globe!.cx)).toBeLessThan(60);
    });
});

describe('travel arcs and plane', () => {
    it('many countries: at most 6 real arcs from the hub, a plane on the longest', () => {
        const m = flatWorldMap({ gold: ['IT', 'FR', 'ES', 'DE', 'JP', 'US', 'BR', 'AU', 'EG', 'TH'] });
        expect(m.arcs.length).toBeGreaterThan(0);
        expect(m.arcs.length).toBeLessThanOrEqual(6);
        expect(m.plane).not.toBeNull();
        for (const d of m.arcs) expect(d).toMatch(/^M[\d.-]+,[\d.-]+Q[\d.-]+,[\d.-]+ [\d.-]+,[\d.-]+$/);
    });

    it('one country: one landing arc that ends on it, with the plane', () => {
        const m = globeWorldMap({ gold: ['IT'] });
        expect(m.arcs).toHaveLength(1);
        expect(m.plane).not.toBeNull();
    });

    it('no country: no arcs, no plane (nothing fake)', () => {
        const m = flatWorldMap({ gold: [] });
        expect(m.arcs).toEqual([]);
        expect(m.plane).toBeNull();
    });

    it('globe: countries on the hidden side get no arc', () => {
        const m = globeWorldMap({ gold: ['NZ'] }, { lng: 12, lat: 42 });
        expect(m.arcs).toEqual([]);
        expect(m.plane).toBeNull();
    });
});

describe('card map wiring', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    // Source without comments: the comments may well say "never a WebView".
    const read = (p: string) => (fs.readFileSync(path.join(__dirname, '..', '..', '..', p), 'utf8') as string)
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    const card = read('src/components/ShareCard.tsx');
    const map = read('src/components/CountryMap.tsx');

    it('the card draws the real countries, no fake pins, never a WebView or the 3D globe', () => {
        expect(card).toMatch(/<CountryMap\s/);
        expect(card).not.toMatch(/const PINS|PLANE_PATH|Ellipse/);
        for (const src of [card, map]) expect(src).not.toMatch(/WebView|EarthGlobe|globe\.html/);
    });

    it('singular labels and the "other side of the globe" line exist in the 8 languages', () => {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { translations } = require('../../i18n/translations');
        const langs = Object.keys(translations);
        expect(langs).toHaveLength(8);
        for (const lang of langs) {
            for (const key of ['cardTripOne', 'cardCountryOne', 'cardContinentOne', 'cardMapHiddenOne', 'cardMapHiddenMany']) {
                expect(typeof translations[lang][key]).toBe('string');
            }
            expect(translations[lang].cardMapHiddenMany).toContain('{count}');
        }
        expect(translations.it.cardCountryOne).toBe('Paese');
        expect(translations.en.cardTripOne).toBe('Trip');
    });
});
