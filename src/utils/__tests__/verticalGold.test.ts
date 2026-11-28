import fs from 'fs';
import path from 'path';

// 1.4.0 block M: gold for everything "visited", also in the old screens, with ONE
// gold (the one of "Where have you been?", the card and the globe). Trips and
// photos stay blue; the globe, its pins and the icon are not touched here.
const read = (rel: string) => fs.readFileSync(path.join(__dirname, '../../..', rel), 'utf8');
const GOLD = '#FBBF24';

describe('gold for "visited" in the old screens', () => {
    it('numbers bar: flag and number of countries in gold, trips stay blue', () => {
        const app = read('App.tsx');
        expect(app).toMatch(/<Ionicons name="flag-outline" size=\{13\} color="#FBBF24" \/>\s*<Text style=\{\[styles\.statValue, styles\.statValueGold\]\}>\{stats\.countries\}/);
        expect(app).toMatch(/<Text style=\{styles\.statValue\}>\{stats\.visitedTrips\}/);
        expect(app).toMatch(new RegExp(`statValueGold: \{ color: '${GOLD}' \}`));
    });

    it('Statistics: countries visited in gold', () => {
        const src = read('src/components/StatsScreen.tsx');
        expect(src).toMatch(/testID="stats-countries" style=\{\[styles\.bigNum, styles\.bigNumGold\]\}/);
        expect(src).toMatch(new RegExp(`bigNumGold: \{ color: '${GOLD}' \}`));
    });

    it('menu grouped by country: the count of the country in gold', () => {
        const src = read('src/components/TripSidebar.tsx');
        expect(src).toMatch(/<View style=\{styles\.sectionBadge\}>\s*<Text style=\{styles\.sectionCount\}>\{count\}/);
        expect(src).toMatch(new RegExp(`sectionCount: \{ color: '${GOLD}'`));
    });

    it('Calendar: the days with a trip marked in gold', () => {
        const src = read('src/components/CalendarView.tsx');
        expect(src).toMatch(new RegExp(`const GOLD = '${GOLD}'`));
        expect(src).toMatch(/tripDayText: \{ color: GOLD/);
        expect(src).toMatch(/tripDot: \{[^}]*backgroundColor: GOLD/);
    });

    it('one gold only: every file that defines a gold uses the same one', () => {
        const dir = path.join(__dirname, '../../components');
        for (const f of fs.readdirSync(dir).filter(n => n.endsWith('.tsx'))) {
            const m = /const GOLD = '([^']+)'/.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
            if (m) expect([f, m[1]]).toEqual([f, GOLD]);
        }
    });
});
