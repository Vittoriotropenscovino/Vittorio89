import { Trip } from '../types';
import { continentForCountryCode } from './countryContinents';

export interface TravelStats {
    countries: number;
    continents: number;
    trips: number;
}

/**
 * Distinct-country key for a trip — identical to the logic StatsScreen already
 * uses, so the share card and the in-app stats screen always agree. Prefers the
 * canonical ISO countryCode, then the (localized) country name, then the last
 * comma-segment of locationName, which almost always ends with the country.
 */
export const countryKeyOf = (trip: Trip): string | undefined => {
    const key =
        trip.countryCode || trip.country || trip.locationName.split(',').pop()?.trim();
    return key || undefined;
};

/**
 * Aggregate travel stats for the "share your globe" card.
 * - countries: distinct countries (3 trips in Italy = 1 country).
 * - continents: distinct continents, derived from each trip's ISO countryCode
 *   when present (trips without a country code don't contribute here).
 * - trips: total number of saved trips.
 * Handles the empty case (returns all zeros).
 */
export const getTravelStats = (trips: Trip[]): TravelStats => {
    if (!trips || trips.length === 0) {
        return { countries: 0, continents: 0, trips: 0 };
    }

    const countries = new Set<string>();
    const continents = new Set<string>();

    for (const trip of trips) {
        const key = countryKeyOf(trip);
        if (key) countries.add(key);

        const continent = continentForCountryCode(trip.countryCode);
        if (continent) continents.add(continent);
    }

    return {
        countries: countries.size,
        continents: continents.size,
        trips: trips.length,
    };
};
