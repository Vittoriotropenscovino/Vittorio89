import { Trip } from '../types';
import { continentForCountryCode } from './countryContinents';
import { getVisitedCountries } from './visitedCountries';

// Kept here too: older imports (and tests) read the key from travelStats.
export { countryKeyOf } from './visitedCountries';

export interface TravelStats {
    countries: number;
    continents: number;
    trips: number;
}

/**
 * Aggregate travel stats for the HUD, Statistics and the "share your globe" card.
 * - countries: distinct visited countries = trips' countries ∪ marked countries
 *   (getVisitedCountries, the single source). 3 trips in Italy + Italy marked = 1.
 * - continents: distinct continents of those countries.
 * - trips: real trips only (marked countries are not trips).
 * Wishlist entries (places not visited yet) are left out of all three numbers,
 * exactly like the lit countries on the globe.
 */
export const getTravelStats = (
    trips: readonly Trip[] | undefined | null,
    markedCountries: readonly string[] = [],
): TravelStats => {
    const visited = getVisitedCountries(trips, markedCountries);

    const continents = new Set<string>();
    for (const code of visited.codes) {
        const continent = continentForCountryCode(code);
        if (continent) continents.add(continent);
    }

    return {
        countries: visited.count,
        continents: continents.size,
        trips: (trips || []).filter((trip) => !trip.isWishlist).length,
    };
};
