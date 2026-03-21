import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState } from 'react-native';
import * as Crypto from 'expo-crypto';
import StorageService from '../services/StorageService';
import { Trip, Itinerary } from '../types';

type TranslateFn = (key: string) => string | string[];

const SAVE_DEBOUNCE_MS = 800;

export function useTrips(t: TranslateFn) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tripsRef = useRef(trips);
  const itinerariesRef = useRef(itineraries);

  // Keep refs in sync for the AppState listener
  tripsRef.current = trips;
  itinerariesRef.current = itineraries;

  const generateId = useCallback((): string => {
    return Crypto.randomUUID();
  }, []);

  // Load trips and itineraries, then check auto-backup
  useEffect(() => {
    (async () => {
      try {
        await StorageService.migrateData();
        const [savedTrips, savedItineraries] = await Promise.all([
          StorageService.loadTrips(),
          StorageService.loadItineraries(),
        ]);
        setTrips(savedTrips);
        setItineraries(savedItineraries);
        StorageService.checkAndPerformAutoBackup(savedTrips, savedItineraries).catch(() => {});
        StorageService.checkAndCleanOrphanedMedia().catch(() => {});
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Debounced auto-save: waits 800ms of inactivity before writing
  useEffect(() => {
    if (!isLoading) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(async () => {
        try {
          await StorageService.saveAll(trips, itineraries);
          console.log('[TravelSphere] Auto-save completed');
        } catch (error) {
          console.error('[TravelSphere] Auto-save failed, retrying...', error);
          setTimeout(async () => {
            try {
              await StorageService.saveAll(trips, itineraries);
            } catch {
              Alert.alert(t('error') as string, t('saveFailedFinal') as string);
            }
          }, 2000);
        }
      }, SAVE_DEBOUNCE_MS);

      return () => {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
      };
    }
  }, [trips, itineraries, isLoading, t]);

  // Flush pending save immediately when app goes to background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background' && saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
        StorageService.saveAll(tripsRef.current, itinerariesRef.current).catch(console.error);
      }
    });
    return () => sub.remove();
  }, []);

  const saveTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>, editingTrip: Trip | null): string => {
    let tripId: string;
    if (editingTrip) {
      tripId = editingTrip.id;
      setTrips((prev) => prev.map((tr) => tr.id === editingTrip.id ? { ...tr, ...tripData } : tr));
    } else {
      tripId = generateId();
      const newTrip: Trip = { ...tripData, id: tripId, createdAt: Date.now() };
      setTrips((prev) => [...prev, newTrip]);
    }
    // Update itinerary membership
    if (tripData.itineraryId) {
      setItineraries((prev) => {
        const targetExists = prev.some((it) => it.id === tripData.itineraryId);
        if (!targetExists) return prev; // Don't modify itineraries if target doesn't exist
        return prev.map((it) => {
          if (it.id === tripData.itineraryId) {
            const ids = it.tripIds.includes(tripId) ? it.tripIds : [...it.tripIds, tripId];
            return { ...it, tripIds: ids };
          }
          return { ...it, tripIds: it.tripIds.filter((id) => id !== tripId) };
        });
      });
    } else {
      setItineraries((prev) => prev.map((it) => ({
        ...it, tripIds: it.tripIds.filter((id) => id !== tripId),
      })));
    }
    return tripId;
  }, [generateId]);

  const deleteTrip = useCallback(async (tripId: string) => {
    setTrips((prevTrips) => prevTrips.filter((t) => t.id !== tripId));
    // Also remove from itineraries
    setItineraries((prev) => prev.map((it) => ({
      ...it, tripIds: it.tripIds.filter((id) => id !== tripId),
    })));
  }, []);

  const toggleFavorite = useCallback((tripId: string) => {
    setTrips((prev) => prev.map((tr) =>
      tr.id === tripId ? { ...tr, isFavorite: !tr.isFavorite } : tr
    ));
  }, []);

  const createItinerary = useCallback((name: string): Itinerary => {
    const newIt: Itinerary = { id: generateId(), name, tripIds: [], createdAt: Date.now() };
    setItineraries((prev) => [...prev, newIt]);
    return newIt;
  }, [generateId]);

  const deleteItinerary = useCallback((id: string) => {
    setItineraries((prev) => prev.filter((it) => it.id !== id));
    setTrips((prev) => prev.map((tr) =>
      tr.itineraryId === id ? { ...tr, itineraryId: undefined } : tr
    ));
  }, []);

  const renameItinerary = useCallback((id: string, newName: string) => {
    setItineraries((prev) => prev.map((it) =>
      it.id === id ? { ...it, name: newName } : it
    ));
  }, []);

  return {
    trips,
    setTrips,
    itineraries,
    setItineraries,
    isLoading,
    saveTrip,
    deleteTrip,
    toggleFavorite,
    createItinerary,
    deleteItinerary,
    renameItinerary,
  };
}
