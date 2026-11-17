import { COUNTRY_SHAPES } from './countryShapes';
import { COUNTRY_POINTS } from './countryCoordinates';

/**
 * The map of the share cards: the user's REAL countries, drawn as plain SVG
 * paths (react-native-svg). No WebView and never a capture of the 3D globe.
 *
 * Two styles to choose from (checkpoint): a flat world map (Natural Earth
 * projection) or a globe (orthographic projection) turned towards the largest
 * group of visited countries. Everything here is pure math, so it is tested
 * with jest and costs a few milliseconds.
 *
 * Paths are merged by colour (all the other countries in one path, the visited
 * ones in another...), so the card draws a handful of SVG elements, not 176.
 */

const RAD = Math.PI / 180;

interface Shape { code: string; rings: number[][] } // ring = [lng, lat, lng, lat, ...] in degrees

let shapesCache: Shape[] | null = null;
const shapes = (): Shape[] => {
    if (shapesCache) return shapesCache;
    shapesCache = COUNTRY_SHAPES.map(([code, encoded]) => ({
        code,
        rings: encoded.split(' ').map((ring) => ring.split(',').map((n) => Number(n) / 10)),
    }));
    return shapesCache;
};

const SHAPED = new Set(COUNTRY_SHAPES.map(([code]) => code).filter(Boolean));
/** True when the 110m map draws the country; the others (Malta, Singapore...) become a dot. */
export const hasShape = (code: string): boolean => SHAPED.has(code);

export interface MapDot { x: number; y: number; tone: 'gold' | 'dim' }

/** A plane on a travel arc: position and heading in degrees (0 = pointing up). */
export interface MapPlane { x: number; y: number; angle: number }

export interface WorldMapDrawing {
    /** viewBox size: the drawing goes in "0 0 width height". */
    width: number;
    height: number;
    /** Countries not visited (and land outside the 197). */
    land: string;
    /** Visited countries (recap: the countries of the year). */
    gold: string;
    /** Recap only: countries visited in other years. */
    dim: string;
    /** Small states without a shape, and visited countries too small to see. */
    dots: MapDot[];
    /** Travel arcs between the gold countries (SVG path data, one per arc). */
    arcs: string[];
    /** The plane, on the longest arc (or landing on the only country). */
    plane: MapPlane | null;
    /** Globe only: visited countries left on the hidden side. */
    hidden: string[];
    /** Globe only: centre and radius of the sphere. */
    globe?: { cx: number; cy: number; r: number };
}

export interface WorldMapInput {
    /** Full-gold countries (normal card: all visited; recap: the year's). */
    gold: readonly string[];
    /** Muted-gold countries (recap: visited in other years). */
    dim?: readonly string[];
}

type Point = [number, number];
const fmt = (n: number) => Math.round(n * 10) / 10;
const ringPath = (pts: Point[]): string => {
    if (pts.length < 3) return '';
    let d = `M${fmt(pts[0][0])},${fmt(pts[0][1])}`;
    for (let i = 1; i < pts.length; i++) d += `L${fmt(pts[i][0])},${fmt(pts[i][1])}`;
    return `${d}Z`;
};

/** Small on the map → a gold dot on top, so a single small country still shows. */
const SMALL_SIDE = 14;
const isSmall = (rings: Point[][]): Point | null => {
    let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
    let biggest: Point[] = [];
    for (const r of rings) {
        if (r.length > biggest.length) biggest = r;
        for (const [x, y] of r) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
    }
    if (!biggest.length || Math.max(maxX - minX, maxY - minY) >= SMALL_SIDE) return null;
    return [(minX + maxX) / 2, (minY + maxY) / 2];
};

const toneOf = (gold: Set<string>, dim: Set<string>, code: string): 'gold' | 'dim' | 'land' =>
    !code ? 'land' : gold.has(code) ? 'gold' : dim.has(code) ? 'dim' : 'land';

const draw = (
    input: WorldMapInput,
    project: (lng: number, lat: number) => Point | null,
    projectRing: (ring: number[]) => Point[][],
): Pick<WorldMapDrawing, 'land' | 'gold' | 'dim' | 'dots'> => {
    const gold = new Set(input.gold);
    const dim = new Set((input.dim || []).filter((c) => !gold.has(c)));
    const out = { land: '', gold: '', dim: '', dots: [] as MapDot[] };
    for (const shape of shapes()) {
        const tone = toneOf(gold, dim, shape.code);
        const rings: Point[][] = [];
        for (const ring of shape.rings) rings.push(...projectRing(ring));
        if (!rings.length) continue;
        out[tone] += rings.map(ringPath).join('');
        if (tone !== 'land') {
            const c = isSmall(rings);
            if (c) out.dots.push({ x: c[0], y: c[1], tone });
        }
    }
    for (const code of [...gold, ...dim]) {
        if (hasShape(code)) continue;
        const p = COUNTRY_POINTS[code];
        const xy = p && project(p[1], p[0]);
        if (xy) out.dots.push({ x: xy[0], y: xy[1], tone: gold.has(code) ? 'gold' : 'dim' });
    }
    // Muted dots first, so gold ones stay on top.
    out.dots.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === 'dim' ? -1 : 1));
    return out;
};

// ───────────────────────── Travel arcs + plane ─────────────────────────

const MAX_ARCS = 6;

/**
 * Real travel arcs, no decoration: from the "hub" (the gold country closest to
 * the middle of the group) to the farthest gold countries, at most 6, curved
 * upwards. The plane flies on the longest one, two thirds of the way. With a
 * single country, a short arc comes in from the upper left and the plane lands.
 */
export const travelArcs = (anchors: Point[], focus: Point): Pick<WorldMapDrawing, 'arcs' | 'plane'> => {
    if (!anchors.length) return { arcs: [], plane: null };
    const dist = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    let hub = anchors[0];
    for (const p of anchors) if (dist(p, focus) < dist(hub, focus)) hub = p;
    let targets = anchors.filter((p) => p !== hub && dist(p, hub) > 25);
    if (!targets.length) {
        // One country (or all in one spot): a landing arc from the upper left.
        targets = [[hub[0] - 150, hub[1] - 110]];
        const [from] = targets;
        const ctl: Point = [(from[0] + hub[0]) / 2 + 10, Math.min(from[1], hub[1]) - 40];
        const t = 0.62;
        return {
            arcs: [`M${fmt(from[0])},${fmt(from[1])}Q${fmt(ctl[0])},${fmt(ctl[1])} ${fmt(hub[0])},${fmt(hub[1])}`],
            plane: planeOn(from, ctl, hub, t),
        };
    }
    targets.sort((a, b) => dist(b, hub) - dist(a, hub));
    targets = targets.slice(0, MAX_ARCS);
    const arcs: string[] = [];
    let plane: MapPlane | null = null;
    targets.forEach((to, i) => {
        const d = dist(hub, to);
        const lift = Math.min(160, d * 0.28);
        const mid: Point = [(hub[0] + to[0]) / 2, (hub[1] + to[1]) / 2];
        // Perpendicular, on the upper side, so every arc bows "up" like a flight.
        let nx = -(to[1] - hub[1]) / d; let ny = (to[0] - hub[0]) / d;
        if (ny > 0) { nx = -nx; ny = -ny; }
        const ctl: Point = [mid[0] + nx * lift, mid[1] + ny * lift];
        arcs.push(`M${fmt(hub[0])},${fmt(hub[1])}Q${fmt(ctl[0])},${fmt(ctl[1])} ${fmt(to[0])},${fmt(to[1])}`);
        if (i === 0) plane = planeOn(hub, ctl, to, 0.62);
    });
    return { arcs, plane };
};

const planeOn = (a: Point, c: Point, b: Point, t: number): MapPlane => {
    const u = 1 - t;
    const x = u * u * a[0] + 2 * u * t * c[0] + t * t * b[0];
    const y = u * u * a[1] + 2 * u * t * c[1] + t * t * b[1];
    const dx = 2 * u * (c[0] - a[0]) + 2 * t * (b[0] - c[0]);
    const dy = 2 * u * (c[1] - a[1]) + 2 * t * (b[1] - c[1]);
    return { x: fmt(x), y: fmt(y), angle: Math.round((Math.atan2(dy, dx) * 180) / Math.PI + 90) };
};

/** Anchor point of each gold country on the map (hidden ones on the globe are left out). */
const anchorsOf = (codes: readonly string[], project: (lng: number, lat: number) => Point | null): Point[] => {
    const out: Point[] = [];
    for (const code of codes) {
        const p = COUNTRY_POINTS[code];
        const xy = p && project(p[1], p[0]);
        if (xy) out.push(xy);
    }
    return out;
};

// ───────────────────────── Flat world map ─────────────────────────

/** Natural Earth I projection (same formula as d3-geo), radians in, unit plane out. */
export const naturalEarth = (lng: number, lat: number): Point => {
    const l = lng * RAD; const p = lat * RAD;
    const p2 = p * p; const p4 = p2 * p2;
    return [
        l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
        p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))),
    ];
};

const FLAT_W = 1000;
const LAT_TOP = 84;     // north of Greenland/Canada
const LAT_BOTTOM = -57; // south of Tierra del Fuego (Antarctica is not drawn)

export const flatWorldMap = (input: WorldMapInput): WorldMapDrawing => {
    const xMax = naturalEarth(180, 0)[0];
    const yTop = naturalEarth(0, LAT_TOP)[1];
    const yBottom = naturalEarth(0, LAT_BOTTOM)[1];
    const k = FLAT_W / (2 * xMax);
    const height = Math.round((yTop - yBottom) * k);
    const project = (lng: number, lat: number): Point => {
        const [x, y] = naturalEarth(lng, lat);
        return [(x + xMax) * k, (yTop - y) * k];
    };
    // Rings that cross the 180° meridian (eastern Russia, Fiji) would draw a
    // line across the whole map: they are drawn twice, once shifted east and
    // once west, and the map clips what falls outside its edges.
    const projectRing = (ring: number[]): Point[][] => {
        let crosses = false;
        for (let i = 0; i < ring.length && !crosses; i += 2) {
            const k = (i + 2) % ring.length;
            if (Math.abs(ring[k] - ring[i]) > 180) crosses = true;
        }
        const copy = (shift: (lng: number) => number): Point[] => {
            const pts: Point[] = [];
            for (let i = 0; i < ring.length; i += 2) pts.push(project(shift(ring[i]), ring[i + 1]));
            return pts;
        };
        if (!crosses) return [copy((lng) => lng)];
        return [copy((lng) => (lng < 0 ? lng + 360 : lng)), copy((lng) => (lng > 0 ? lng - 360 : lng))];
    };
    const anchors = anchorsOf(input.gold, project);
    const focus: Point = anchors.length
        ? [anchors.reduce((s, p) => s + p[0], 0) / anchors.length, anchors.reduce((s, p) => s + p[1], 0) / anchors.length]
        : [FLAT_W / 2, height / 2];
    return { width: FLAT_W, height, hidden: [], ...travelArcs(anchors, focus), ...draw(input, project, projectRing) };
};

// ───────────────────────── Globe ─────────────────────────

type Vec = [number, number, number];
const toVec = (lng: number, lat: number): Vec => {
    const l = lng * RAD; const p = lat * RAD;
    return [Math.cos(p) * Math.cos(l), Math.cos(p) * Math.sin(l), Math.sin(p)];
};
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: Vec): Vec | null => {
    const n = Math.hypot(v[0], v[1], v[2]);
    return n < 1e-9 ? null : [v[0] / n, v[1] / n, v[2] / n];
};
const toLngLat = (v: Vec): { lng: number; lat: number } => ({
    lng: Math.atan2(v[1], v[0]) / RAD,
    lat: Math.asin(Math.max(-1, Math.min(1, v[2]))) / RAD,
});

/** A visited country is "well in view" within 70° of the centre... */
const VIEW_COS = Math.cos(70 * RAD);
/** ...and "on the hidden side" past 80° (at the rim it would be a sliver). */
const HIDDEN_COS = Math.cos(80 * RAD);
/** Never look at the globe from the poles: the centre stays between 40°S and 45°N. */
const LAT_MIN = -40;
const LAT_MAX = 45;
/** No visited country: Europe and Africa, like the app's globe at start. */
export const DEFAULT_GLOBE_CENTER = { lng: 12, lat: 30 };

const pointOf = (code: string): Vec | null => {
    const p = COUNTRY_POINTS[code];
    return p ? toVec(p[1], p[0]) : null;
};

/**
 * Centre of the globe: the point that keeps in view the largest number of
 * visited countries (each visited country is a candidate, plus the average of
 * all), then the average of the countries in view, so the group sits in the
 * middle. Latitude is kept between 40°S and 45°N for a natural view.
 */
export const chooseGlobeCenter = (codes: readonly string[]): { lng: number; lat: number } => {
    const pts = codes.map(pointOf).filter((v): v is Vec => v !== null);
    if (!pts.length) return { ...DEFAULT_GLOBE_CENTER };
    const candidates: Vec[] = [...pts];
    const mean = norm(pts.reduce<Vec>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0]));
    if (mean) candidates.push(mean);
    let best = candidates[0];
    let bestCount = -1;
    let bestSum = -Infinity;
    for (const c of candidates) {
        let count = 0; let sum = 0;
        for (const p of pts) {
            const d = dot(c, p);
            if (d >= VIEW_COS) { count += 1; sum += d; }
        }
        if (count > bestCount || (count === bestCount && sum > bestSum)) {
            best = c; bestCount = count; bestSum = sum;
        }
    }
    const group = pts.filter((p) => dot(best, p) >= VIEW_COS);
    const centre = norm(group.reduce<Vec>((s, p) => [s[0] + p[0], s[1] + p[1], s[2] + p[2]], [0, 0, 0])) || best;
    const { lng, lat } = toLngLat(centre);
    return { lng: Math.round(lng * 10) / 10, lat: Math.round(Math.max(LAT_MIN, Math.min(LAT_MAX, lat)) * 10) / 10 };
};

/** Visited countries that a globe centred there leaves on the hidden side. */
export const hiddenOnGlobe = (codes: readonly string[], centre: { lng: number; lat: number }): string[] => {
    const c = toVec(centre.lng, centre.lat);
    return codes.filter((code) => {
        const p = pointOf(code);
        return p !== null && dot(c, p) < HIDDEN_COS;
    });
};

const GLOBE_SIZE = 1000;
const GLOBE_R = 480;

export const globeWorldMap = (
    input: WorldMapInput,
    centre: { lng: number; lat: number } = chooseGlobeCenter(input.gold),
): WorldMapDrawing => {
    const cx = GLOBE_SIZE / 2; const cy = GLOBE_SIZE / 2; const r = GLOBE_R;
    const c = toVec(centre.lng, centre.lat);
    // Screen axes: east and north as seen from the centre point.
    const east = norm([-c[1], c[0], 0]) || ([0, 1, 0] as Vec);
    const north: Vec = [
        c[1] * east[2] - c[2] * east[1],
        c[2] * east[0] - c[0] * east[2],
        c[0] * east[1] - c[1] * east[0],
    ];
    const screen = (v: Vec): Point => [cx + r * dot(v, east), cy - r * dot(v, north)];
    const rim = (v: Vec): Point => {
        const x = dot(v, east); const y = dot(v, north);
        const n = Math.hypot(x, y) || 1;
        return [cx + (r * x) / n, cy - (r * y) / n];
    };
    const project = (lng: number, lat: number): Point | null => {
        const v = toVec(lng, lat);
        return dot(v, c) >= 0 ? screen(v) : null;
    };
    const angleOf = (p: Point) => Math.atan2(p[1] - cy, p[0] - cx);
    const rimAt = (a: number): Point => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const crossing = (a: Vec, b: Vec): Point | null => {
        const da = dot(a, c); const db = dot(b, c);
        const t = da / (da - db);
        const x = norm([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]), a[2] + t * (b[2] - a[2])]);
        return x ? rim(x) : null;
    };
    // Clip a ring to the visible hemisphere: the visible stretches as they are,
    // the exact points where the border goes over the horizon, and between the
    // exit and the next entry an arc along the rim (the shorter way round,
    // right for anything the size of a country).
    const projectRing = (ring: number[]): Point[][] => {
        const vs: Vec[] = [];
        for (let i = 0; i < ring.length; i += 2) vs.push(toVec(ring[i], ring[i + 1]));
        const start = vs.findIndex((v) => dot(v, c) >= 0);
        if (start < 0) return [];
        if (vs.every((v) => dot(v, c) >= 0)) return [vs.map(screen)];
        const n = vs.length;
        const pts: Point[] = [];
        let exit: Point | null = null;
        for (let k = 0; k < n; k++) {
            const a = vs[(start + k) % n];
            const b = vs[(start + k + 1) % n];
            const va = dot(a, c) >= 0; const vb = dot(b, c) >= 0;
            if (va) pts.push(screen(a));
            if (va && !vb) exit = crossing(a, b);
            if (!va && vb) {
                const entry = crossing(a, b);
                if (exit && entry) {
                    const a0 = angleOf(exit);
                    let delta = angleOf(entry) - a0;
                    if (delta > Math.PI) delta -= 2 * Math.PI;
                    if (delta < -Math.PI) delta += 2 * Math.PI;
                    const steps = Math.max(1, Math.ceil(Math.abs(delta) / (4 * RAD)));
                    for (let j = 0; j <= steps; j++) pts.push(rimAt(a0 + (delta * j) / steps));
                }
                exit = null;
            }
        }
        return pts.length >= 3 ? [pts] : [];
    };
    return {
        width: GLOBE_SIZE,
        height: GLOBE_SIZE,
        globe: { cx, cy, r },
        hidden: hiddenOnGlobe(input.gold, centre),
        ...travelArcs(anchorsOf(input.gold, project), [cx, cy]),
        ...draw(input, project, projectRing),
    };
};
