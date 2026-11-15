import { Trip } from '../types';
import { countryCodeFromName, foldText } from './countries';

/**
 * THE single source of "countries I have been to". The globe, the home-screen
 * HUD, Statistics and the share card all go through getVisitedCountries, so the
 * numbers can never disagree again.
 *
 * Visited = union of
 *   - the countries of the trips already made (wishlist entries excluded), and
 *   - the countries ticked in "Where have you been?" (marked countries: no date,
 *     no pin, they are not trips).
 */

const lastSegment = (locationName: string | undefined): string | undefined =>
    locationName?.split(',').pop()?.trim() || undefined;

/**
 * ISO alpha-2 code of the country a trip is in, or undefined when it cannot be
 * told. Trips saved by older versions (or typed by hand) may have no
 * countryCode: their country name is then matched against the names of every
 * country in the app's 8 languages, ignoring case and accents. Saved trips are
 * never rewritten — this happens only while counting.
 */
export const tripCountryCode = (trip: Trip): string | undefined => {
    const saved = trip.countryCode?.trim().toUpperCase();
    if (saved) return saved;
    return countryCodeFromName(trip.country) ?? countryCodeFromName(lastSegment(trip.locationName));
};

/**
 * Distinct-country key of a trip: its ISO code when known, otherwise the
 * country name as written (folded), so an unknown place still counts as one
 * country, as it always did.
 */
export const countryKeyOf = (trip: Trip): string | undefined => {
    const code = tripCountryCode(trip);
    if (code) return code;
    const raw = (trip.country || lastSegment(trip.locationName) || '').trim();
    return raw ? foldText(raw) || raw : undefined;
};

export interface VisitedCountries {
    /** ISO codes of every visited country: they light the globe and give continents. */
    codes: string[];
    /** Distinct visited countries: the codes plus the names that match no code. */
    count: number;
}

export const getVisitedCountries = (
    trips: readonly Trip[] | undefined | null,
    markedCountries: readonly string[] = [],
): VisitedCountries => {
    const codes = new Set<string>();
    const unmatched = new Set<string>();
    for (const trip of trips || []) {
        if (trip.isWishlist) continue;
        const code = tripCountryCode(trip);
        if (code) {
            codes.add(code);
            continue;
        }
        const key = countryKeyOf(trip);
        if (key) unmatched.add(key);
    }
    for (const marked of markedCountries || []) {
        const code = typeof marked === 'string' ? marked.trim().toUpperCase() : '';
        if (code) codes.add(code);
    }
    return { codes: Array.from(codes), count: codes.size + unmatched.size };
};
