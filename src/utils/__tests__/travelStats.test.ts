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
        // @ts-expect-error guard against undefined input at runtime
        expect(getTravelStats(undefined)).toEqual({ countries: 0, continents: 0, trips: 0 });
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
        // 'Italia' and 'Portogallo' are distinct keys; no countryCode → 0 continents.
        expect(stats).toEqual({ countries: 2, continents: 0, trips: 2 });
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
    it('prefers countryCode, then country, then locationName tail', () => {
        expect(countryKeyOf(makeTrip({ countryCode: 'IT', country: 'Italia', locationName: 'Roma, Italia' }))).toBe('IT');
        expect(countryKeyOf(makeTrip({ country: 'Italia', locationName: 'Roma, Italia' }))).toBe('Italia');
        expect(countryKeyOf(makeTrip({ locationName: 'Roma, Lazio, Italia' }))).toBe('Italia');
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
