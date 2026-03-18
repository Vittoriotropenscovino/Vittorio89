import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Crypto from 'expo-crypto';
import StorageService from '../services/StorageService';
import { Trip, Itinerary } from '../types';

type TranslateFn = (key: string) => string | string[];

export function useTrips(t: TranslateFn) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const generateId = useCallback((): string => {
    return Crypto.randomUUID();
  }, []);

  // Load trips and itineraries, then check auto-backup
  useEffect(() => {
    (async () => {
      try {
        const [savedTrips, savedItineraries] = await Promise.all([
          StorageService.loadTrips(),
          StorageService.loadItineraries(),
        ]);
        setTrips(savedTrips);
        setItineraries(savedItineraries);
        StorageService.checkAndPerformAutoBackup(savedTrips).catch(() => {});
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Robust auto-save trips with retry
  useEffect(() => {
    if (!isLoading) {
      StorageService.saveTrips(trips).catch(async (error) => {
        console.error('Error saving trips:', error);
        await new Promise((r) => setTimeout(r, 2000));
        try {
          await StorageService.saveTrips(trips);
        } catch {
          Alert.alert(t('error') as string, t('saveFailedFinal') as string);
        }
      });
    }
  }, [trips, isLoading, t]);

  // Robust auto-save itineraries with retry
  useEffect(() => {
    if (!isLoading) {
      StorageService.saveItineraries(itineraries).catch(async (error) => {
        console.error('Error saving itineraries:', error);
        await new Promise((r) => setTimeout(r, 2000));
        try {
          await StorageService.saveItineraries(itineraries);
        } catch {
          Alert.alert(t('error') as string, t('saveFailedFinal') as string);
        }
      });
    }
  }, [itineraries, isLoading, t]);

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
      setItineraries((prev) => prev.map((it) => {
        if (it.id === tripData.itineraryId) {
          const ids = it.tripIds.includes(tripId) ? it.tripIds : [...it.tripIds, tripId];
          return { ...it, tripIds: ids };
        }
        return { ...it, tripIds: it.tripIds.filter((id) => id !== tripId) };
      }));
    } else {
      setItineraries((prev) => prev.map((it) => ({
        ...it, tripIds: it.tripIds.filter((id) => id !== tripId),
      })));
    }
    return tripId;
  }, [generateId]);

  const deleteTrip = useCallback(async (tripId: string) => {
    setTrips((prevTrips) => {
      const updatedTrips = prevTrips.filter((t) => t.id !== tripId);
      StorageService.saveTrips(updatedTrips);
      return updatedTrips;
    });
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
