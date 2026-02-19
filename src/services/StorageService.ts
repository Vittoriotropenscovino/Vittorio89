import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Trip, HomeLocation, Itinerary } from '../types';
import { extractCountryFromLocationName } from '../utils/geocoding';

const TRIPS_STORAGE_KEY = '@travelsphere_trips';
const HOME_LOCATION_KEY = '@travelsphere_home';
const ITINERARIES_KEY = '@travelsphere_itineraries';
const MEDIA_DIR = FileSystem.documentDirectory + 'media/';

/**
 * Storage service for persisting trips, home location, and itineraries
 */
export const StorageService = {
    /**
     * Save all trips to persistent storage
     */
    saveTrips: async (trips: Trip[]): Promise<void> => {
        try {
            const jsonValue = JSON.stringify(trips);
            await AsyncStorage.setItem(TRIPS_STORAGE_KEY, jsonValue);
        } catch (error) {
            console.error('Error saving trips:', error);
            throw error;
        }
    },

    /**
     * Load all trips from persistent storage with country migration
     */
    loadTrips: async (): Promise<Trip[]> => {
        try {
            const jsonValue = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
            if (jsonValue !== null) {
                const trips = JSON.parse(jsonValue) as Trip[];

                // Migrate: backfill country field for existing trips
                let needsSave = false;
                const migratedTrips = trips.map(trip => {
                    if (!trip.country) {
                        needsSave = true;
                        return {
                            ...trip,
                            country: extractCountryFromLocationName(trip.locationName),
                        };
                    }
                    return trip;
                });

                // Verify media files still exist
                const verifiedTrips = await Promise.all(
                    migratedTrips.map(async (trip) => {
                        const verifiedMedia = await Promise.all(
                            trip.media.map(async (item) => {
                                try {
                                    const fileInfo = await FileSystem.getInfoAsync(item.uri);
                                    if (fileInfo.exists) {
                                        return item;
                                    }
                                    return null;
                                } catch {
                                    return null;
                                }
                            })
                        );
                        return {
                            ...trip,
                            media: verifiedMedia.filter((m) => m !== null) as typeof trip.media,
                        };
                    })
                );

                // Save migrated data if needed
                if (needsSave) {
                    await StorageService.saveTrips(verifiedTrips);
                }

                return verifiedTrips;
            }
            return [];
        } catch (error) {
            console.error('Error loading trips:', error);
            return [];
        }
    },

    /**
     * Delete a single trip and its associated media
     */
    deleteTrip: async (tripId: string, trips: Trip[]): Promise<Trip[]> => {
        const tripToDelete = trips.find((t) => t.id === tripId);

        // Delete associated media files
        if (tripToDelete) {
            for (const media of tripToDelete.media) {
                if (media.uri.startsWith(MEDIA_DIR)) {
                    try {
                        await FileSystem.deleteAsync(media.uri, { idempotent: true });
                    } catch (error) {
                        console.error('Error deleting media file:', error);
                    }
                }
            }
        }

        const updatedTrips = trips.filter((t) => t.id !== tripId);
        await StorageService.saveTrips(updatedTrips);
        return updatedTrips;
    },

    /**
     * Save home location
     */
    saveHomeLocation: async (home: HomeLocation): Promise<void> => {
        try {
            await AsyncStorage.setItem(HOME_LOCATION_KEY, JSON.stringify(home));
        } catch (error) {
            console.error('Error saving home location:', error);
            throw error;
        }
    },

    /**
     * Load home location
     */
    loadHomeLocation: async (): Promise<HomeLocation | null> => {
        try {
            const jsonValue = await AsyncStorage.getItem(HOME_LOCATION_KEY);
            if (jsonValue !== null) {
                return JSON.parse(jsonValue) as HomeLocation;
            }
            return null;
        } catch (error) {
            console.error('Error loading home location:', error);
            return null;
        }
    },

    /**
     * Save itineraries
     */
    saveItineraries: async (itineraries: Itinerary[]): Promise<void> => {
        try {
            await AsyncStorage.setItem(ITINERARIES_KEY, JSON.stringify(itineraries));
        } catch (error) {
            console.error('Error saving itineraries:', error);
            throw error;
        }
    },

    /**
     * Load itineraries
     */
    loadItineraries: async (): Promise<Itinerary[]> => {
        try {
            const jsonValue = await AsyncStorage.getItem(ITINERARIES_KEY);
            if (jsonValue !== null) {
                return JSON.parse(jsonValue) as Itinerary[];
            }
            return [];
        } catch (error) {
            console.error('Error loading itineraries:', error);
            return [];
        }
    },

    /**
     * Clear all data (for debugging/reset)
     */
    clearAll: async (): Promise<void> => {
        try {
            await AsyncStorage.multiRemove([TRIPS_STORAGE_KEY, HOME_LOCATION_KEY, ITINERARIES_KEY]);
            const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
            if (dirInfo.exists) {
                await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
            }
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    },

    /**
     * Get storage info (for debugging)
     */
    getStorageInfo: async (): Promise<{ tripCount: number; mediaSize: number }> => {
        try {
            const trips = await StorageService.loadTrips();
            let mediaSize = 0;

            const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
            if (dirInfo.exists) {
                const files = await FileSystem.readDirectoryAsync(MEDIA_DIR);
                for (const file of files) {
                    const fileInfo = await FileSystem.getInfoAsync(MEDIA_DIR + file);
                    if (fileInfo.exists && 'size' in fileInfo) {
                        mediaSize += fileInfo.size || 0;
                    }
                }
            }

            return {
                tripCount: trips.length,
                mediaSize,
            };
        } catch (error) {
            console.error('Error getting storage info:', error);
            return { tripCount: 0, mediaSize: 0 };
        }
    },
};

export default StorageService;
