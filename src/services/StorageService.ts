import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Trip, Itinerary } from '../types';

const TRIPS_STORAGE_KEY = '@travelsphere_trips';
const ITINERARIES_STORAGE_KEY = '@travelsphere_itineraries';
const LAST_BACKUP_KEY = '@travelsphere_last_backup';
export const MEDIA_DIR = FileSystem.documentDirectory + 'media/';
const BACKUP_DIR = FileSystem.documentDirectory + 'backups/';
const BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_BACKUPS = 3;
const isWeb = Platform.OS === 'web';

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
            console.error('Error saving trips:', error);
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

                // On web, FileSystem is not fully supported - skip media verification
                if (isWeb) {
                    return trips.map((trip) => ({
                        ...trip,
                        notes: trip.notes || '',
                    }));
                }

                // Verify media files still exist (native only)
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
                            notes: trip.notes || '',
                            media: verifiedMedia.filter((m) => m !== null) as typeof trip.media,
                        };
                    })
                );
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

        // Delete associated media files (native only)
        if (tripToDelete && !isWeb) {
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
     * Clear all data (for debugging/reset)
     */
    clearAll: async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(TRIPS_STORAGE_KEY);
            await AsyncStorage.removeItem(ITINERARIES_STORAGE_KEY);
            // Also clear media directory (native only)
            if (!isWeb) {
                const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
                if (dirInfo.exists) {
                    await FileSystem.deleteAsync(MEDIA_DIR, { idempotent: true });
                }
            }
        } catch (error) {
            console.error('Error clearing storage:', error);
            throw error;
        }
    },

    /**
     * Save itineraries to persistent storage
     */
    saveItineraries: async (itineraries: Itinerary[]): Promise<void> => {
        try {
            const jsonValue = JSON.stringify(itineraries);
            await AsyncStorage.setItem(ITINERARIES_STORAGE_KEY, jsonValue);
        } catch (error) {
            console.error('Error saving itineraries:', error);
            throw error;
        }
    },

    /**
     * Load itineraries from persistent storage
     */
    loadItineraries: async (): Promise<Itinerary[]> => {
        try {
            const jsonValue = await AsyncStorage.getItem(ITINERARIES_STORAGE_KEY);
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
     * Get storage info (for debugging)
     */
    getStorageInfo: async (): Promise<{ tripCount: number; mediaSize: number }> => {
        try {
            const trips = await StorageService.loadTrips();
            let mediaSize = 0;

            if (!isWeb) {
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
    /**
     * Check if auto-backup is due and perform it if needed
     */
    checkAndPerformAutoBackup: async (trips: Trip[]): Promise<boolean> => {
        if (isWeb || trips.length === 0) return false;
        try {
            const lastBackup = await AsyncStorage.getItem(LAST_BACKUP_KEY);
            const lastBackupTime = lastBackup ? parseInt(lastBackup, 10) : 0;
            if (Date.now() - lastBackupTime < BACKUP_INTERVAL_MS) return false;

            // Ensure backup directory exists
            const dirInfo = await FileSystem.getInfoAsync(BACKUP_DIR);
            if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(BACKUP_DIR, { intermediates: true });

            // Save backup
            const data = JSON.stringify({ trips, exportDate: new Date().toISOString(), version: '1.0' }, null, 2);
            const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await FileSystem.writeAsStringAsync(BACKUP_DIR + filename, data);

            // Clean old backups (keep only MAX_BACKUPS most recent)
            const files = await FileSystem.readDirectoryAsync(BACKUP_DIR);
            const backupFiles = files.filter((f) => f.startsWith('backup_')).sort().reverse();
            for (let i = MAX_BACKUPS; i < backupFiles.length; i++) {
                await FileSystem.deleteAsync(BACKUP_DIR + backupFiles[i], { idempotent: true });
            }

            await AsyncStorage.setItem(LAST_BACKUP_KEY, String(Date.now()));
            return true;
        } catch (error) {
            console.error('Auto-backup error:', error);
            return false;
        }
    },
};

export default StorageService;
