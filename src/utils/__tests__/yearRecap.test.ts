import {
    dismissRecapYear, getYearRecap, recapCampaign, recapNoticeYear, recapYearFor, tripYear,
} from '../yearRecap';
import { Trip } from '../../types';

const makeTrip = (over: Partial<Trip>): Trip => ({
    id: Math.random().toString(36).slice(2),
    title: 'T',
    locationName: 'Somewhere',
    latitude: 0,
    longitude: 0,
    date: '2026-05-01',
    notes: '',
    media: [],
    createdAt: 1700000000000,
    ...over,
});

// Local dates (month is 0-based): what the phone shows.
const day = (d: number, m: number, y: number) => new Date(y, m - 1, d, 12, 0, 0);

describe('recap year from the phone date', () => {
    it('15/12/2026 → 2026', () => expect(recapYearFor(day(15, 12, 2026))).toBe(2026));
    it('10/01/2027 → 2026 (January shows the year just ended)', () => expect(recapYearFor(day(10, 1, 2027))).toBe(2026));
    it('15/12/2027 → 2027', () => expect(recapYearFor(day(15, 12, 2027))).toBe(2027));
    it('15/06/2027 → no recap', () => expect(recapYearFor(day(15, 6, 2027))).toBeNull());
    it('the edges: 1/12 and 31/1 yes, 30/11 and 1/2 no', () => {
        expect(recapYearFor(day(1, 12, 2026))).toBe(2026);
        expect(recapYearFor(day(31, 1, 2027))).toBe(2026);
        expect(recapYearFor(day(30, 11, 2026))).toBeNull();
        expect(recapYearFor(day(1, 2, 2027))).toBeNull();
    });
    it('keeps working in later years (no year written in the code)', () => {
        expect(recapYearFor(day(20, 12, 2031))).toBe(2031);
        expect(recapYearFor(day(5, 1, 2040))).toBe(2039);
    });
    it('QR campaign is recap{year}', () => {
        expect(recapCampaign(2026)).toBe('recap2026');
        expect(recapCampaign(2027)).toBe('recap2027');
    });
});

describe('main-screen notice, closed per year', () => {
    it('shows in December and January, not in June', () => {
        expect(recapNoticeYear(day(15, 12, 2026), [])).toBe(2026);
        expect(recapNoticeYear(day(10, 1, 2027), undefined)).toBe(2026);
        expect(recapNoticeYear(day(15, 6, 2027), [])).toBeNull();
    });
    it('closed in December 2026: gone in January 2027, back in December 2027', () => {
        const dismissed = dismissRecapYear([], 2026);
        expect(dismissed).toEqual([2026]);
        expect(recapNoticeYear(day(16, 12, 2026), dismissed)).toBeNull();
        expect(recapNoticeYear(day(10, 1, 2027), dismissed)).toBeNull();
        expect(recapNoticeYear(day(15, 12, 2027), dismissed)).toBe(2027);
    });
    it('closing twice does not duplicate, and junk in the setting is ignored', () => {
        expect(dismissRecapYear([2026, 2026], 2026)).toEqual([2026]);
        expect(dismissRecapYear([2027, 2026.5 as number, NaN], 2026)).toEqual([2026, 2027]);
    });
});

describe('trip year', () => {
    it('reads the saved YYYY-MM-DD date', () => expect(tripYear({ date: '2026-12-31' })).toBe(2026));
    it('reads day/month/year from imports', () => expect(tripYear({ date: '05/08/2025' })).toBe(2025));
    it('no date → null', () => {
        expect(tripYear({ date: '' })).toBeNull();
        expect(tripYear({ date: 'boh' })).toBeNull();
        expect(tripYear({ date: undefined as unknown as string })).toBeNull();
    });
});

describe('getYearRecap', () => {
    const trips = [
        makeTrip({ date: '2024-07-01', countryCode: 'FR' }),
        makeTrip({ date: '2026-03-10', countryCode: 'FR' }), // FR again: not new
        makeTrip({ date: '2026-05-01', countryCode: 'JP' }), // new
        makeTrip({ date: '2026-05-04', countryCode: 'JP' }), // same country, 2 trips
        makeTrip({ date: '2026-09-20', country: 'Italia', locationName: 'Roma, Italia' }), // no code: IT, new
        makeTrip({ date: '2026-10-02', countryCode: 'BR', isWishlist: true }), // wishlist: out
        makeTrip({ date: '2027-01-03', countryCode: 'US' }), // next year: out
    ];

    it('counts trips, countries, continents and new countries of the year', () => {
        const r = getYearRecap(trips, [], 2026);
        expect(r).toMatchObject({ year: 2026, trips: 4, countries: 3, newCountries: 2, continents: 2 });
    });

    it('marked countries never make a country "not new", but they count in the all-time total', () => {
        const r = getYearRecap(trips, ['JP', 'IT', 'PE'], 2026);
        expect(r.newCountries).toBe(2);
        // all time: FR, JP, IT, US + marked PE = 5 (JP/IT marked too: no double count)
        expect(r.totalCountries).toBe(5);
        expect(r.totalPct).toBe('3'); // 5/197 = 2.5% → 3
    });

    it('"Roma, Italia" without a code and an IT trip are the same country', () => {
        const r = getYearRecap([
            makeTrip({ date: '2026-02-01', country: 'Italia', locationName: 'Roma, Italia' }),
            makeTrip({ date: '2026-08-01', countryCode: 'IT' }),
        ], [], 2026);
        expect(r.countries).toBe(1);
        expect(r.newCountries).toBe(1);
    });

    it('a country visited in an earlier year is not new even if that trip had no code', () => {
        const r = getYearRecap([
            makeTrip({ date: '2023-02-01', country: 'Italia', locationName: 'Roma, Italia' }),
            makeTrip({ date: '2026-08-01', countryCode: 'IT' }),
        ], [], 2026);
        expect(r.newCountries).toBe(0);
    });

    it('a year without trips: zeros, total still there', () => {
        const r = getYearRecap(trips, ['PE'], 2025);
        expect(r).toMatchObject({ trips: 0, countries: 0, newCountries: 0, continents: 0, totalCountries: 5 });
    });

    it('trips without a date are in no year', () => {
        const r = getYearRecap([makeTrip({ date: '', countryCode: 'ES' })], [], 2026);
        expect(r.trips).toBe(0);
        expect(r.totalCountries).toBe(1);
    });
});
