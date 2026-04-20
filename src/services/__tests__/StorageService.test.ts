import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

// Mock modules before importing StorageService
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue(''),
}));

jest.mock('expo-crypto', () => ({
  digestStringAsync: jest.fn().mockResolvedValue('mock-sha256-hash'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
}));

import { StorageService } from '../StorageService';
import { Trip, Itinerary } from '../../types';

const mockTrip: Trip = {
  id: 'test-uuid-1',
  title: 'Roma',
  locationName: 'Roma, Italia',
  latitude: 41.9028,
  longitude: 12.4964,
  date: '2024-06-15',
  notes: 'Bellissimo viaggio',
  media: [],
  createdAt: 1700000000000,
};

const mockTripWithMedia: Trip = {
  ...mockTrip,
  id: 'test-uuid-2',
  title: 'Milano',
  media: [
    { uri: '/mock/documents/media/photo1.jpg', type: 'image', width: 800, height: 600 },
  ],
};

const mockTripMinimal: Trip = {
  id: 'test-uuid-3',
  title: 'Napoli',
  locationName: 'Napoli, Italia',
  latitude: 40.8518,
  longitude: 14.2681,
  date: '2024-07-01',
  notes: '',
  media: [],
  createdAt: 1700000000000,
};

const mockItinerary: Itinerary = {
  id: 'itin-1',
  name: 'Tour Italia',
  tripIds: ['test-uuid-1'],
  createdAt: 1700000000000,
};

describe('StorageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── SAVE / LOAD TRIPS ───

  describe('saveTrips / loadTrips', () => {
    it('should save array of trips, load them, and get identical data', async () => {
      const trips = [mockTrip, mockTripMinimal];
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveTrips(trips);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@travelsphere_trips',
        JSON.stringify(trips),
      );

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(trips));
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      const loaded = await StorageService.loadTrips();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe('test-uuid-1');
      expect(loaded[0].title).toBe('Roma');
      expect(loaded[1].id).toBe('test-uuid-3');
      expect(loaded[1].title).toBe('Napoli');
    });

    it('should save empty array and load empty array', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveTrips([]);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@travelsphere_trips', '[]');

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('[]');
      const loaded = await StorageService.loadTrips();
      expect(loaded).toEqual([]);
    });

    it('should handle trips with all optional fields undefined without crash', async () => {
      const tripWithUndefined = {
        ...mockTrip,
        tags: undefined,
        isFavorite: undefined,
        isWishlist: undefined,
        country: undefined,
        countryCode: undefined,
        itineraryId: undefined,
        showArc: undefined,
      } as any as Trip;

      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveTrips([tripWithUndefined]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify([tripWithUndefined])
      );
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      const loaded = await StorageService.loadTrips();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].title).toBe('Roma');
    });

    it('should save trips with media URI without verifying file existence on web', async () => {
      // Re-mock Platform as web for this test
      jest.resetModules();
      jest.doMock('react-native', () => ({ Platform: { OS: 'web' } }));
      jest.doMock('@react-native-async-storage/async-storage', () => ({
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
      }));
      jest.doMock('expo-file-system', () => ({
        documentDirectory: '/mock/documents/',
        getInfoAsync: jest.fn(),
        makeDirectoryAsync: jest.fn(),
        deleteAsync: jest.fn(),
        readDirectoryAsync: jest.fn(),
        writeAsStringAsync: jest.fn(),
        readAsStringAsync: jest.fn(),
      }));
      jest.doMock('expo-crypto', () => ({
        digestStringAsync: jest.fn().mockResolvedValue('mock-sha256-hash'),
        CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
      }));

      const { StorageService: WebStorageService } = require('../StorageService');
      const WebAsyncStorage = require('@react-native-async-storage/async-storage');
      const WebFileSystem = require('expo-file-system');

      (WebAsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockTripWithMedia]));
      const loaded = await WebStorageService.loadTrips();

      // On web, getInfoAsync should NOT be called for media verification
      expect(WebFileSystem.getInfoAsync).not.toHaveBeenCalled();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].media).toHaveLength(1);

      // Restore original modules
      jest.resetModules();
    });

    it('should return empty array when no data stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await StorageService.loadTrips();
      expect(result).toEqual([]);
    });

    it('should return empty array on corrupted JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json{{{');
      const result = await StorageService.loadTrips();
      expect(result).toEqual([]);
    });

    it('should throw on save failure', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
      await expect(StorageService.saveTrips([mockTrip])).rejects.toThrow('Storage full');
    });
  });

  // ─── DELETE TRIP ───

  describe('deleteTrip', () => {
    it('should remove existing trip from results', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const trips = [mockTrip, mockTripMinimal];
      const result = await StorageService.deleteTrip('test-uuid-1', trips);
      expect(result).toHaveLength(1);
      expect(result.find((t: Trip) => t.id === 'test-uuid-1')).toBeUndefined();
      expect(result[0].id).toBe('test-uuid-3');
    });

    it('should leave array unchanged and not throw for non-existent ID', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      const trips = [mockTrip];
      const result = await StorageService.deleteTrip('non-existent-id', trips);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-uuid-1');
    });

    it('should delete associated media files on native', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      const result = await StorageService.deleteTrip('test-uuid-2', [mockTripWithMedia]);
      expect(result).toHaveLength(0);
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        '/mock/documents/media/photo1.jpg',
        { idempotent: true },
      );
    });
  });

  // ─── ITINERARIES ───

  describe('Itineraries', () => {
    it('should save and load itineraries with identical data', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveItineraries([mockItinerary]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockItinerary]));
      const loaded = await StorageService.loadItineraries();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('itin-1');
      expect(loaded[0].name).toBe('Tour Italia');
      expect(loaded[0].tripIds).toEqual(['test-uuid-1']);
      expect(loaded[0].createdAt).toBe(1700000000000);
    });

    it('should save and load itinerary with empty tripIds', async () => {
      const emptyItin: Itinerary = { ...mockItinerary, tripIds: [] };
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveItineraries([emptyItin]);

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([emptyItin]));
      const loaded = await StorageService.loadItineraries();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].tripIds).toEqual([]);
    });

    it('should return empty array when no itineraries stored', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await StorageService.loadItineraries();
      expect(result).toEqual([]);
    });

    it('should return empty array on corrupted JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted');
      const result = await StorageService.loadItineraries();
      expect(result).toEqual([]);
    });

    it('should throw on save failure', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Quota exceeded'));
      await expect(StorageService.saveItineraries([mockItinerary])).rejects.toThrow('Quota exceeded');
    });
  });

  // ─── MIGRATE DATA ───

  describe('migrateData', () => {
    it('should add default fields to v0 data (no schemaVersion)', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_schema_version') return Promise.resolve(null);
        if (key === '@travelsphere_trips') return Promise.resolve(JSON.stringify([
          { id: '1', title: 'Test', locationName: 'A', latitude: 0, longitude: 0, date: '2024-01-01', createdAt: 1 },
        ]));
        if (key === '@travelsphere_itineraries') return Promise.resolve('[]');
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await StorageService.migrateData();

      const savedTrips = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: any[]) => c[0] === '@travelsphere_trips'
        )[1]
      );
      expect(savedTrips[0].tags).toEqual([]);
      expect(savedTrips[0].isFavorite).toBe(false);
      expect(savedTrips[0].isWishlist).toBe(false);
      expect(savedTrips[0].media).toEqual([]);
      expect(savedTrips[0].notes).toBe('');
      expect(savedTrips[0].title).toBe('Test'); // original field preserved
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@travelsphere_schema_version', '1');
    });

    it('should not modify data already at current version', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_schema_version') return Promise.resolve('1');
        return Promise.resolve(null);
      });

      await StorageService.migrateData();

      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should handle empty AsyncStorage without error and set current version', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await StorageService.migrateData();

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@travelsphere_schema_version', '1');
    });

    it('should be idempotent - running twice produces same result', async () => {
      const v0Trip = { id: '1', title: 'Test', locationName: 'A', latitude: 0, longitude: 0, date: '2024-01-01', createdAt: 1 };

      // First run: v0
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_schema_version') return Promise.resolve(null);
        if (key === '@travelsphere_trips') return Promise.resolve(JSON.stringify([v0Trip]));
        if (key === '@travelsphere_itineraries') return Promise.resolve('[]');
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await StorageService.migrateData();

      const firstRunTrips = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: any[]) => c[0] === '@travelsphere_trips'
        )[1]
      );

      jest.clearAllMocks();

      // Second run: already at v1 → no writes
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_schema_version') return Promise.resolve('1');
        return Promise.resolve(null);
      });

      await StorageService.migrateData();
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();

      // First run result had defaults applied correctly
      expect(firstRunTrips[0].tags).toEqual([]);
      expect(firstRunTrips[0].isFavorite).toBe(false);
    });

    it('should preserve existing fields and not overwrite with defaults', async () => {
      const tripWithExistingFields = {
        id: '1', title: 'Test', locationName: 'A', latitude: 0, longitude: 0,
        date: '2024-01-01', createdAt: 1,
        tags: ['sea', 'food'],
        isFavorite: true,
        notes: 'existing notes',
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_schema_version') return Promise.resolve(null);
        if (key === '@travelsphere_trips') return Promise.resolve(JSON.stringify([tripWithExistingFields]));
        if (key === '@travelsphere_itineraries') return Promise.resolve('[]');
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      await StorageService.migrateData();

      const savedTrips = JSON.parse(
        (AsyncStorage.setItem as jest.Mock).mock.calls.find(
          (c: any[]) => c[0] === '@travelsphere_trips'
        )[1]
      );
      expect(savedTrips[0].tags).toEqual(['sea', 'food']);
      expect(savedTrips[0].isFavorite).toBe(true);
      expect(savedTrips[0].notes).toBe('existing notes');
      expect(savedTrips[0].isWishlist).toBe(false); // default added for missing field
    });
  });

  // ─── BACKUP WITH CHECKSUM ───

  describe('Backup con checksum', () => {
    it('should create backup with valid checksum present', async () => {
      const trips = [mockTrip];
      const itineraries = [mockItinerary];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_last_backup') return Promise.resolve('0');
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.readDirectoryAsync as jest.Mock).mockResolvedValue([]);

      const backupData = { trips, itineraries };
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('valid-hash-123');
      (FileSystem.readAsStringAsync as jest.Mock).mockImplementation(() => {
        return Promise.resolve(JSON.stringify({
          schemaVersion: 1,
          checksum: 'valid-hash-123',
          createdAt: new Date().toISOString(),
          data: backupData,
        }));
      });

      const result = await StorageService.checkAndPerformAutoBackup(trips, itineraries);
      expect(result).toBe(true);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();

      // Verify the written backup contains a checksum
      const writtenContent = JSON.parse(
        (FileSystem.writeAsStringAsync as jest.Mock).mock.calls[0][1]
      );
      expect(writtenContent.checksum).toBeDefined();
      expect(typeof writtenContent.checksum).toBe('string');
    });

    it('should detect corrupted backup (data modified) with checksum mismatch', async () => {
      const backupData = { trips: [mockTrip] };
      (Crypto.digestStringAsync as jest.Mock).mockResolvedValue('recalculated-hash');

      const content = JSON.stringify({
        schemaVersion: 1,
        checksum: 'original-hash-different',
        createdAt: '2024-01-01T00:00:00Z',
        data: backupData,
      });

      const result = await StorageService.validateBackup(content);
      expect(result.valid).toBe(false);
      expect(result.hasChecksum).toBe(true);
    });

    it('should handle malformed JSON in validateBackup without crashing', async () => {
      const result = await StorageService.validateBackup('not valid json{{{');
      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.hasChecksum).toBe(false);
    });

    it('should load legacy backup without checksum without errors', async () => {
      const content = JSON.stringify({
        trips: [mockTrip],
        exportDate: '2024-01-01T00:00:00Z',
        version: '1.0',
      });

      const result = await StorageService.validateBackup(content);
      expect(result.valid).toBe(true);
      expect(result.hasChecksum).toBe(false);
      expect(result.data.trips).toHaveLength(1);
    });

    it('should not rotate old backups if new backup is invalid (checksum mismatch)', async () => {
      const trips = [mockTrip];
      const itineraries: Itinerary[] = [];

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => {
        if (key === '@travelsphere_last_backup') return Promise.resolve('0');
        return Promise.resolve(null);
      });
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });

      // Write hash differs from verify hash → checksum mismatch
      let callCount = 0;
      (Crypto.digestStringAsync as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount === 1 ? 'write-hash' : 'different-hash');
      });
      (FileSystem.readAsStringAsync as jest.Mock).mockResolvedValue(
        JSON.stringify({
          schemaVersion: 1,
          checksum: 'write-hash',
          data: { trips, itineraries },
        })
      );

      const result = await StorageService.checkAndPerformAutoBackup(trips, itineraries);
      expect(result).toBe(false);
      // Should delete the bad new backup
      expect(FileSystem.deleteAsync).toHaveBeenCalled();
      // Should NOT have rotated (readDirectoryAsync not called for rotation)
      expect(FileSystem.readDirectoryAsync).not.toHaveBeenCalled();
      // Should NOT update last backup timestamp
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        '@travelsphere_last_backup',
        expect.any(String),
      );
    });
  });

  // ─── CLEAR ALL ───

  describe('clearAll', () => {
    it('should remove both storage keys', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      await StorageService.clearAll();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@travelsphere_trips');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@travelsphere_itineraries');
    });

    it('should result in empty loadTrips after clearAll', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      await StorageService.clearAll();

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const trips = await StorageService.loadTrips();
      expect(trips).toEqual([]);
    });

    it('should result in empty loadItineraries after clearAll', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: false });
      await StorageService.clearAll();

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const itineraries = await StorageService.loadItineraries();
      expect(itineraries).toEqual([]);
    });

    it('should delete media directory if it exists on native', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      (FileSystem.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true });
      (FileSystem.deleteAsync as jest.Mock).mockResolvedValue(undefined);
      await StorageService.clearAll();
      expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
        '/mock/documents/media/',
        { idempotent: true },
      );
    });
  });
});
