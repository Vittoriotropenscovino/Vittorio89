import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Trip } from '../types';
import logger from '../utils/logger';

const TRIPS_STORAGE_KEY = '@travelsphere_trips';
const MEDIA_DIR = FileSystem.documentDirectory + 'media/';

/**
 * Storage service for persisting trips data
 * Uses AsyncStorage for trip metadata and FileSystem for media files
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
            logger.error('Error saving trips:', error);
            throw error;
        }
    },

    /**
     * Load all trips from persistent storage
     */
    loadTrips: async (): Promise<Trip[]> => {
        try {
            const jsonValue = await AsyncStorage.getItem(TRIPS_STORAGE_KEY);
            if (jsonValue !== null) {
                const trips = JSON.parse(jsonValue) as Trip[];
                // Verify media files still exist
                const verifiedTrips = await Promise.all(
                    trips.map(async (trip) => {
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
                return verifiedTrips;
            }
            return [];
        } catch (error) {
            logger.error('Error loading trips:', error);
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
                        logger.error('Error deleting media file:', error);
                    }
                }
            }
        }

        const updatedTrips = trips.filter((t) => t.id !== tripId);
        await StorageService.saveTrips(updatedTrips);
        return updatedTrips;
    },

    /**
     * Clear all data (for debugging/reset)
     */
    clearAll: async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(TRIPS_STORAGE_KEY);
            // Also clear media directory
            const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
            if (dirInfo.exists) {
                await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
            }
        } catch (error) {
            logger.error('Error clearing storage:', error);
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
            logger.error('Error getting storage info:', error);
            return { tripCount: 0, mediaSize: 0 };
        }
    },
};

export default StorageService;
