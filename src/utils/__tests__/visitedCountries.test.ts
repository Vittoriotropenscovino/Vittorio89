import { getVisitedCountries, tripCountryCode } from '../visitedCountries';
import { Trip } from '../../types';

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

describe('getVisitedCountries: trips ∪ marked countries', () => {
    it('is empty with nothing', () => {
        expect(getVisitedCountries([], [])).toEqual({ codes: [], count: 0 });
        expect(getVisitedCountries(undefined)).toEqual({ codes: [], count: 0 });
    });

    it('marked countries alone light the globe and count', () => {
        const v = getVisitedCountries([], ['IT', 'JP']);
        expect(v.codes.sort()).toEqual(['IT', 'JP']);
        expect(v.count).toBe(2);
    });

    it('no duplicates when a country is both travelled and marked', () => {
        const trips = [makeTrip({ countryCode: 'IT' }), makeTrip({ countryCode: 'IT' }), makeTrip({ countryCode: 'FR' })];
        const v = getVisitedCountries(trips, ['IT', 'FR', 'IT']);
        expect(v.codes.sort()).toEqual(['FR', 'IT']);
        expect(v.count).toBe(2);
    });

    it('wishlist trips are not visited countries', () => {
        const trips = [makeTrip({ countryCode: 'EG', isWishlist: true })];
        expect(getVisitedCountries(trips)).toEqual({ codes: [], count: 0 });
    });

    it('Roma, Italia saved without a code + a trip with IT = 1 country', () => {
        const trips = [
            makeTrip({ locationName: 'Roma, Italia' }),
            makeTrip({ locationName: 'Firenze, Toscana, Italia', countryCode: 'IT' }),
        ];
        expect(getVisitedCountries(trips)).toEqual({ codes: ['IT'], count: 1 });
    });

    it('the same country saved without code in two languages = 1 country', () => {
        const trips = [
            makeTrip({ locationName: 'Parigi, Francia' }),
            makeTrip({ locationName: 'Lyon, France' }),
            makeTrip({ country: 'Frankreich', locationName: 'Nizza' }),
        ];
        expect(getVisitedCountries(trips)).toEqual({ codes: ['FR'], count: 1 });
    });

    it('a codeless trip and the same country marked = 1 country', () => {
        expect(getVisitedCountries([makeTrip({ locationName: 'Tokyo, Giappone' })], ['JP']).count).toBe(1);
    });

    it('a name that matches no country still counts once, but lights nothing', () => {
        const trips = [
            makeTrip({ locationName: 'Base Alfa, Terra di Nessuno' }),
            makeTrip({ locationName: 'Base Beta, terra di nessùno' }),
        ];
        expect(getVisitedCountries(trips, ['IT'])).toEqual({ codes: ['IT'], count: 2 });
    });

    it('lowercase codes from old data are the same country', () => {
        const trips = [makeTrip({ countryCode: 'it' }), makeTrip({ countryCode: 'IT' })];
        expect(getVisitedCountries(trips, ['it'])).toEqual({ codes: ['IT'], count: 1 });
    });

    it('territories from trips still count as their own country', () => {
        const trips = [makeTrip({ countryCode: 'PR' }), makeTrip({ countryCode: 'US' })];
        expect(getVisitedCountries(trips).count).toBe(2);
    });
});

describe('tripCountryCode', () => {
    it('trusts the saved code over the name', () => {
        expect(tripCountryCode(makeTrip({ countryCode: 'ES', locationName: 'Roma, Italia' }))).toBe('ES');
    });

    it('uses country, then the tail of locationName', () => {
        expect(tripCountryCode(makeTrip({ country: 'Spagna', locationName: 'Somewhere' }))).toBe('ES');
        expect(tripCountryCode(makeTrip({ locationName: 'Lisboa, Portugal' }))).toBe('PT');
        expect(tripCountryCode(makeTrip({ countryCode: '', locationName: 'Lisboa, Portugal' }))).toBe('PT');
    });
});
