import { Trip } from '../types';
import { continentForCountryCode } from './countryContinents';
import { countryKeyOf, getVisitedCountries } from './visitedCountries';
import { worldPercentLabel } from './countries';

/**
 * "My {year} in travel" — the year recap. It must work every year, so no year
 * is ever written in the code or in the texts: everything starts from the
 * phone's date.
 *
 * - December and January show the year just lived: Dec 2026 and Jan 2027 → 2026,
 *   Dec 2027 and Jan 2028 → 2027. The rest of the year there is no recap notice.
 * - The numbers come from real trips (wishlist excluded) dated in that year.
 * - A NEW country of the year: at least one trip dated in that year and no trip
 *   dated in an earlier year. Countries ticked in "Where have you been?" have no
 *   date, so they never make a country "not new".
 */

/** Recap year for a phone date, or null outside December–January. */
export const recapYearFor = (now: Date): number | null => {
    const month = now.getMonth(); // 0 = January, 11 = December
    if (month === 11) return now.getFullYear();
    if (month === 0) return now.getFullYear() - 1;
    return null;
};

/** utm_campaign of the recap QR: recap2026, recap2027, ... */
export const recapCampaign = (year: number): string => `recap${year}`;

/**
 * Year of a trip from its saved date. The app saves 'YYYY-MM-DD'; imported or
 * very old trips may hold something else, which is read as a date when
 * possible. No usable date → null (the trip is left out of every year).
 */
export const tripYear = (trip: Pick<Trip, 'date'>): number | null => {
    const raw = typeof trip.date === 'string' ? trip.date.trim() : '';
    if (!raw) return null;
    const iso = /^(\d{4})-\d{1,2}(-\d{1,2})?/.exec(raw);
    if (iso) return Number(iso[1]);
    const dmy = /^\d{1,2}[/.-]\d{1,2}[/.-](\d{4})$/.exec(raw);
    if (dmy) return Number(dmy[1]);
    const parsed = Date.parse(raw);
    if (Number.isNaN(parsed)) return null;
    return new Date(parsed).getFullYear();
};

export interface YearRecap {
    year: number;
    /** Real trips dated in the year. */
    trips: number;
    /** Distinct countries of those trips. */
    countries: number;
    /** Countries of the year never seen in a trip of an earlier year. */
    newCountries: number;
    /** Distinct continents of the year's countries. */
    continents: number;
    /** All-time visited countries (trips ∪ marked), the same number as everywhere else. */
    totalCountries: number;
    /** All-time % of the world, as written on the card ('<1' or a number). */
    totalPct: string;
}

export const getYearRecap = (
    trips: readonly Trip[] | undefined | null,
    markedCountries: readonly string[] = [],
    year: number,
): YearRecap => {
    const real = (trips || []).filter((trip) => !trip.isWishlist);
    const ofYear = real.filter((trip) => tripYear(trip) === year);

    const yearVisited = getVisitedCountries(ofYear, []);
    const continents = new Set<string>();
    for (const code of yearVisited.codes) {
        const continent = continentForCountryCode(code);
        if (continent) continents.add(continent);
    }

    const seenBefore = new Set<string>();
    for (const trip of real) {
        const y = tripYear(trip);
        if (y === null || y >= year) continue;
        const key = countryKeyOf(trip);
        if (key) seenBefore.add(key);
    }
    const yearKeys = new Set<string>();
    for (const trip of ofYear) {
        const key = countryKeyOf(trip);
        if (key) yearKeys.add(key);
    }
    let newCountries = 0;
    yearKeys.forEach((key) => { if (!seenBefore.has(key)) newCountries += 1; });

    const total = getVisitedCountries(trips, markedCountries).count;
    return {
        year,
        trips: ofYear.length,
        countries: yearVisited.count,
        newCountries,
        continents: continents.size,
        totalCountries: total,
        totalPct: worldPercentLabel(total),
    };
};

/**
 * Year whose notice belongs on the main screen now, or null. The notice is
 * closed PER YEAR: closing it in December 2026 hides it for 2026 only, so it
 * comes back in December 2027.
 */
export const recapNoticeYear = (now: Date, dismissedYears: readonly number[] | undefined): number | null => {
    const year = recapYearFor(now);
    if (year === null) return null;
    return (dismissedYears || []).includes(year) ? null : year;
};

/** Dismissed years after closing the notice for `year` (no duplicates, sorted). */
export const dismissRecapYear = (dismissedYears: readonly number[] | undefined, year: number): number[] =>
    Array.from(new Set([...(dismissedYears || []).filter((y) => Number.isInteger(y)), year])).sort((a, b) => a - b);
