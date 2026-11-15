import fs from 'fs';
import path from 'path';
import { getTravelStats } from '../travelStats';
import { getVisitedCountries } from '../visitedCountries';
import { Trip } from '../../types';

const readSource = (relPath: string) =>
    fs.readFileSync(path.join(__dirname, '../../..', relPath), 'utf8');

const makeTrip = (over: Partial<Trip>): Trip => ({
    id: Math.random().toString(36).slice(2),
    title: 'T',
    locationName: 'Somewhere',
    latitude: 0,
    longitude: 0,
    date: '2024-01-01',
    notes: '',
    media: [],
    createdAt: 1700000000000,
    ...over,
});

/**
 * The home-screen HUD and the Statistics screen must always show the same
 * country count. They diverged in production twice (24 vs 17, then 10 vs 8)
 * because the HUD re-derived the number by hand instead of reusing
 * getTravelStats. A unit test on getTravelStats alone cannot catch that — the
 * bug was a duplicated implementation, not a wrong one — so these tests assert
 * on the sources themselves.
 */
describe('country count stays consistent between the HUD and Statistics', () => {
    const appSource = readSource('App.tsx');
    const statsSource = readSource('src/components/StatsScreen.tsx');
    const fogSource = readSource('src/hooks/useFogOfWar.ts');
    const travelStatsSource = readSource('src/utils/travelStats.ts');

    it('both screens take the number from getTravelStats, marked countries included', () => {
        expect(appSource).toContain('getTravelStats(trips, markedCountries)');
        expect(statsSource).toMatch(/getTravelStats\(trips, markedCountries\)/);
        // The old one-argument call would silently leave the marked countries out.
        expect(appSource).not.toMatch(/getTravelStats\(trips\)/);
        expect(statsSource).not.toMatch(/getTravelStats\(trips\)/);
    });

    it('the globe, the stats and the card share one source: getVisitedCountries', () => {
        expect(fogSource).toContain('getVisitedCountries(trips, markedCountries)');
        expect(travelStatsSource).toContain('getVisitedCountries(trips, markedCountries)');
        expect(appSource).toContain('useFogOfWar(trips, markedCountries)');
        // useFogOfWar used to collect trip.countryCode by hand: it must not again.
        expect(fogSource).not.toMatch(/countryCode/);
    });

    it('neither screen re-derives countries from locationName', () => {
        // This is the exact shape of the regression: counting the tail of
        // locationName over-counts, because the same country saved in two app
        // languages ("Italia" / "Italy") reads as two.
        const handRolled = /new Set\([^;]*locationName[^;]*\)/;
        expect(appSource).not.toMatch(handRolled);
        expect(statsSource).not.toMatch(handRolled);
    });

    it('the Statistics screen is handed the same unfiltered trips as the HUD', () => {
        // A filter here (e.g. dropping wishlist or media-less trips) would make
        // the two numbers diverge again even with a shared helper.
        // Note: the tag contains arrow functions, so this cannot stop at ">".
        expect(appSource).toMatch(/<StatsScreen[\s\S]*?trips=\{trips\} markedCountries=\{markedCountries\}/);
    });

    it('Roma, Italia saved without a code + a trip with IT = 1 country, everywhere', () => {
        const trips = [
            makeTrip({ locationName: 'Roma, Italia' }),            // old trip, no countryCode
            makeTrip({ locationName: 'Milano, Italia', countryCode: 'IT' }),
        ];
        expect(getTravelStats(trips).countries).toBe(1);           // HUD, Statistics, card
        expect(getVisitedCountries(trips).codes).toEqual(['IT']);  // globe
    });

    it('HUD, Statistics and globe agree once countries are marked', () => {
        const trips = [
            makeTrip({ locationName: 'Paris, France', countryCode: 'FR' }),
            makeTrip({ locationName: 'Lisbona, Portogallo' }),       // no code: PT by name
            makeTrip({ locationName: 'Cairo, Egypt', countryCode: 'EG', isWishlist: true }),
        ];
        const marked = ['FR', 'JP', 'PT', 'AR'];
        const stats = getTravelStats(trips, marked);
        expect(stats.countries).toBe(4);                            // FR, PT, JP, AR
        expect(stats.trips).toBe(2);                                // marked are not trips
        expect(getVisitedCountries(trips, marked).codes.sort()).toEqual(['AR', 'FR', 'JP', 'PT']);
    });

    it('produces one number for a mixed set, whatever the caller', () => {
        // Mirrors the device report: 11 trips, same countries saved under
        // different localized names, plus a wishlist entry.
        const trips = [
            makeTrip({ locationName: 'Roma, Lazio, Italia', countryCode: 'IT' }),
            makeTrip({ locationName: 'Milan, Italy', countryCode: 'IT' }),
            makeTrip({ locationName: 'Napoli, Italia', countryCode: 'IT' }),
            makeTrip({ locationName: 'Paris, France', countryCode: 'FR' }),
            makeTrip({ locationName: 'Parigi, Francia', countryCode: 'FR' }),
            makeTrip({ locationName: 'Madrid, España', countryCode: 'ES' }),
            makeTrip({ locationName: 'Lisboa, Portugal', countryCode: 'PT' }),
            makeTrip({ locationName: 'Tokyo, Japan', countryCode: 'JP' }),
            makeTrip({ locationName: 'Berlin, Deutschland', countryCode: 'DE' }),
            makeTrip({ locationName: 'Wien, Österreich', countryCode: 'AT' }),
            // A wishlist entry: not visited yet, so it is not a visited country
            // (same rule as the lit countries on the globe).
            makeTrip({ locationName: 'Cairo, Egypt', countryCode: 'EG', isWishlist: true }),
        ];

        expect(trips).toHaveLength(11);
        // 7 distinct visited countries: IT, FR, ES, PT, JP, DE, AT (EG is wishlist).
        expect(getTravelStats(trips).countries).toBe(7);
        expect(getTravelStats(trips).trips).toBe(10);

        // The old hand-rolled HUD logic, kept here only to show what it used to
        // return on the very same data — 10, because it split IT and FR in two.
        const legacyCount = new Set(
            trips.map((tr) => tr.locationName.split(',').pop()?.trim())
        ).size;
        expect(legacyCount).toBe(10);   // IT and FR split in two, EG counted
        expect(legacyCount).not.toBe(getTravelStats(trips).countries);
    });
});
