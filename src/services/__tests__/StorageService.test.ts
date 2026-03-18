import AsyncStorage from '@react-native-async-storage/async-storage';

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

  describe('saveTrips', () => {
    it('should serialize and save trips to AsyncStorage', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveTrips([mockTrip]);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@travelsphere_trips',
        JSON.stringify([mockTrip]),
      );
    });

    it('should throw on storage failure', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage full'));
      await expect(StorageService.saveTrips([mockTrip])).rejects.toThrow('Storage full');
    });
  });

  describe('loadTrips', () => {
    it('should return empty array when no data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await StorageService.loadTrips();
      expect(result).toEqual([]);
    });

    it('should return empty array on corrupted JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not valid json{{{');
      const result = await StorageService.loadTrips();
      expect(result).toEqual([]);
    });

    it('should load and return saved trips', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockTrip]));
      const result = await StorageService.loadTrips();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('test-uuid-1');
      expect(result[0].title).toBe('Roma');
    });
  });

  describe('saveItineraries', () => {
    it('should serialize and save itineraries', async () => {
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.saveItineraries([mockItinerary]);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@travelsphere_itineraries',
        JSON.stringify([mockItinerary]),
      );
    });

    it('should throw on storage failure', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Quota exceeded'));
      await expect(StorageService.saveItineraries([mockItinerary])).rejects.toThrow('Quota exceeded');
    });
  });

  describe('loadItineraries', () => {
    it('should return empty array when no data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      const result = await StorageService.loadItineraries();
      expect(result).toEqual([]);
    });

    it('should return empty array on corrupted JSON', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('corrupted');
      const result = await StorageService.loadItineraries();
      expect(result).toEqual([]);
    });

    it('should load and return saved itineraries', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify([mockItinerary]));
      const result = await StorageService.loadItineraries();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Tour Italia');
    });
  });

  describe('clearAll', () => {
    it('should remove both storage keys', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
      await StorageService.clearAll();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@travelsphere_trips');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@travelsphere_itineraries');
    });
  });
});
