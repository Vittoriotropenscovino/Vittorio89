import { useMemo } from 'react';
import { Trip } from '../types';
import { getVisitedCountries } from '../utils/visitedCountries';

/** ISO codes of the countries lit on the globe: trips' countries ∪ marked countries. */
export function useFogOfWar(trips: Trip[], markedCountries: readonly string[] = []): string[] {
  return useMemo(() => getVisitedCountries(trips, markedCountries).codes, [trips, markedCountries]);
}
