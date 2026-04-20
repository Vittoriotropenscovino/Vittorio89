import { useMemo } from 'react';
import { Trip } from '../types';

export function useFogOfWar(trips: Trip[]): string[] {
  return useMemo(() => {
    const codes = new Set<string>();
    trips.forEach((trip) => {
      if (trip.countryCode && !trip.isWishlist) {
        codes.add(trip.countryCode);
      }
    });
    return Array.from(codes);
  }, [trips]);
}
