import { getTravelStats, countryKeyOf } from '../travelStats';
import { continentForCountryCode } from '../countryContinents';
import { Trip } from '../../types';

// Minimal Trip factory — only the fields getTravelStats reads matter.
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

describe('getTravelStats', () => {
    it('returns all zeros for no trips', () => {
        expect(getTravelStats([])).toEqual({ countries: 0, continents: 0, trips: 0 });
        expect(getTravelStats(undefined)).toEqual({ countries: 0, continents: 0, trips: 0 });
        expect(getTravelStats(null, [])).toEqual({ countries: 0, continents: 0, trips: 0 });
    });

    it('dedups countries: 3 trips in Italy = 1 country, 1 continent, 3 trips', () => {
        const trips = [
            makeTrip({ locationName: 'Roma, Lazio, Italia', country: 'Italia', countryCode: 'IT' }),
            makeTrip({ locationName: 'Milano, Italia', country: 'Italia', countryCode: 'IT' }),
            makeTrip({ locationName: 'Napoli, Italia', country: 'Italia', countryCode: 'IT' }),
        ];
        expect(getTravelStats(trips)).toEqual({ countries: 1, continents: 1, trips: 3 });
    });

    it('counts distinct countries and continents across a mix', () => {
        const trips = [
            makeTrip({ countryCode: 'IT' }), // Europe
            makeTrip({ countryCode: 'FR' }), // Europe
            makeTrip({ countryCode: 'JP' }), // Asia
            makeTrip({ countryCode: 'US' }), // North America
            makeTrip({ countryCode: 'BR' }), // South America
        ];
        expect(getTravelStats(trips)).toEqual({ countries: 5, continents: 4, trips: 5 });
    });

    it('falls back to the last segment of locationName when no country/code', () => {
        const trips = [
            makeTrip({ locationName: 'Roma, Lazio, Italia' }),
            makeTrip({ locationName: 'Lisbona, Portogallo' }),
        ];
        const stats = getTravelStats(trips);
        // 'Italia' → IT and 'Portogallo' → PT by name (1.3.0): 2 countries, and
        // now their continent counts too (both Europe).
        expect(stats).toEqual({ countries: 2, continents: 1, trips: 2 });
    });

    it('still counts a place whose country name is unknown, as before', () => {
        const stats = getTravelStats([makeTrip({ locationName: 'Base Alfa, Terra di Nessuno' })]);
        expect(stats).toEqual({ countries: 1, continents: 0, trips: 1 });
    });

    it('collapses the same country saved under different localized names', () => {
        // Regression: the home-screen HUD used to count only the tail of
        // locationName, so these two read as two different countries and it
        // showed 24 where the Statistics screen showed 17. countryCode is what
        // makes them one.
        const trips = [
            makeTrip({ locationName: 'Roma, Lazio, Italia', country: 'Italia', countryCode: 'IT' }),
            makeTrip({ locationName: 'Milan, Italy', country: 'Italy', countryCode: 'IT' }),
        ];
        expect(getTravelStats(trips).countries).toBe(1);
    });

    it('counts continent even when countryCode is lowercase', () => {
        const stats = getTravelStats([makeTrip({ countryCode: 'it' })]);
        expect(stats.continents).toBe(1);
    });

    it('does not count a continent for an unknown country code', () => {
        const stats = getTravelStats([makeTrip({ countryCode: 'ZZ' })]);
        expect(stats.continents).toBe(0);
        expect(stats.countries).toBe(1); // still a distinct country key
    });
});

describe('countryKeyOf', () => {
    it('prefers countryCode, then the country name, then the locationName tail', () => {
        expect(countryKeyOf(makeTrip({ countryCode: 'IT', country: 'Italia', locationName: 'Roma, Italia' }))).toBe('IT');
        // No code: the name is turned into the code, so it meets trips that have one.
        expect(countryKeyOf(makeTrip({ country: 'Italia', locationName: 'Roma, Italia' }))).toBe('IT');
        expect(countryKeyOf(makeTrip({ locationName: 'Roma, Lazio, Italia' }))).toBe('IT');
        expect(countryKeyOf(makeTrip({ locationName: 'Wien, Österreich' }))).toBe('AT');
    });

    it('keeps an unknown name as its own key (case and accents ignored)', () => {
        expect(countryKeyOf(makeTrip({ locationName: 'Base Alfa, Terra di Nessùno' }))).toBe('terra di nessuno');
        expect(countryKeyOf(makeTrip({ locationName: '' }))).toBeUndefined();
    });
});

describe('getTravelStats with marked countries', () => {
    it('counts marked countries as countries and continents, never as trips', () => {
        expect(getTravelStats([], ['IT', 'JP', 'BR'])).toEqual({ countries: 3, continents: 3, trips: 0 });
    });

    it('a country both travelled and marked counts once', () => {
        const trips = [makeTrip({ countryCode: 'IT' }), makeTrip({ countryCode: 'FR' })];
        expect(getTravelStats(trips, ['IT', 'ES'])).toEqual({ countries: 3, continents: 1, trips: 2 });
    });

    it('an old trip without code and the same country marked count once', () => {
        const trips = [makeTrip({ locationName: 'Roma, Italia' })];
        expect(getTravelStats(trips, ['IT']).countries).toBe(1);
    });

    it('a wishlist trip does not make a marked country count twice or a trip', () => {
        const trips = [makeTrip({ countryCode: 'EG', isWishlist: true })];
        expect(getTravelStats(trips, ['EG'])).toEqual({ countries: 1, continents: 1, trips: 0 });
    });
});

describe('continentForCountryCode', () => {
    it('maps representative codes to the right continent', () => {
        expect(continentForCountryCode('IT')).toBe('Europe');
        expect(continentForCountryCode('JP')).toBe('Asia');
        expect(continentForCountryCode('US')).toBe('North America');
        expect(continentForCountryCode('BR')).toBe('South America');
        expect(continentForCountryCode('AU')).toBe('Oceania');
        expect(continentForCountryCode('EG')).toBe('Africa');
    });

    it('returns null for missing/unknown codes', () => {
        expect(continentForCountryCode(undefined)).toBeNull();
        expect(continentForCountryCode('')).toBeNull();
        expect(continentForCountryCode('ZZ')).toBeNull();
    });
});
