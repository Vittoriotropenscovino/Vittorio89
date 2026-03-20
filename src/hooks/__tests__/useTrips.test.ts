import { Trip, Itinerary } from '../../types';

// ─── Mock Setup ───

// Track state set by useState
let tripsState: Trip[] = [];
let itinerariesState: Itinerary[] = [];
let isLoadingState = true;
let setTrips: jest.Mock;
let setItineraries: jest.Mock;
let setIsLoading: jest.Mock;

const mockRandomUUID = jest.fn(() => 'mock-uuid-' + Date.now());

jest.mock('expo-crypto', () => ({
  randomUUID: mockRandomUUID,
}));

jest.mock('expo-file-system', () => ({
  documentDirectory: '/mock/documents/',
  getInfoAsync: jest.fn().mockResolvedValue({ exists: false }),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAlert = jest.fn();
const mockAppStateRemove = jest.fn();
jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Alert: { alert: (...args: any[]) => mockAlert(...args) },
  AppState: { addEventListener: jest.fn(() => ({ remove: mockAppStateRemove })) },
}));

// Mock StorageService
const mockStorageService = {
  migrateData: jest.fn().mockResolvedValue(undefined),
  loadTrips: jest.fn().mockResolvedValue([]),
  loadItineraries: jest.fn().mockResolvedValue([]),
  saveTrips: jest.fn().mockResolvedValue(undefined),
  saveItineraries: jest.fn().mockResolvedValue(undefined),
  checkAndPerformAutoBackup: jest.fn().mockResolvedValue(false),
  checkAndCleanOrphanedMedia: jest.fn().mockResolvedValue(undefined),
  saveAll: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../../services/StorageService', () => ({
  __esModule: true,
  default: mockStorageService,
  StorageService: mockStorageService,
}));

// Mock React hooks to capture the hook's logic
const effectCallbacks: Array<() => void> = [];

jest.mock('react', () => ({
  useState: jest.fn(),
  useEffect: jest.fn((cb: () => void) => {
    effectCallbacks.push(cb);
  }),
  useCallback: jest.fn((cb: any) => cb),
  useRef: jest.fn((initial: any) => ({ current: initial })),
}));

import { useTrips } from '../useTrips';

// ─── Helpers ───

const mockT = jest.fn((key: string) => key);

function setupState(trips: Trip[] = [], itineraries: Itinerary[] = [], loading = true) {
  tripsState = [...trips];
  itinerariesState = [...itineraries];
  isLoadingState = loading;

  setTrips = jest.fn((updater: any) => {
    if (typeof updater === 'function') {
      tripsState = updater(tripsState);
    } else {
      tripsState = updater;
    }
  });
  setItineraries = jest.fn((updater: any) => {
    if (typeof updater === 'function') {
      itinerariesState = updater(itinerariesState);
    } else {
      itinerariesState = updater;
    }
  });
  setIsLoading = jest.fn((val: any) => {
    isLoadingState = typeof val === 'function' ? val(isLoadingState) : val;
  });

  const { useState } = require('react');
  let callIndex = 0;
  (useState as jest.Mock).mockImplementation((initial: any) => {
    const idx = callIndex++;
    if (idx === 0) return [tripsState, setTrips];       // trips
    if (idx === 1) return [itinerariesState, setItineraries]; // itineraries
    if (idx === 2) return [isLoadingState, setIsLoading];     // isLoading
    return [initial, jest.fn()];
  });

  effectCallbacks.length = 0;
}

const baseTripData: Omit<Trip, 'id' | 'createdAt'> = {
  title: 'Roma',
  locationName: 'Roma, Italia',
  latitude: 41.9028,
  longitude: 12.4964,
  date: '2024-06-15',
  notes: 'Test',
  media: [],
};

const existingTrip: Trip = {
  ...baseTripData,
  id: 'existing-id-1',
  createdAt: 1700000000000,
};

const existingTripFav: Trip = {
  ...existingTrip,
  id: 'fav-trip-1',
  isFavorite: true,
};

const existingTripNotFav: Trip = {
  ...existingTrip,
  id: 'notfav-trip-1',
  isFavorite: false,
};

const existingItinerary: Itinerary = {
  id: 'itin-1',
  name: 'Tour Italia',
  tripIds: ['existing-id-1'],
  createdAt: 1700000000000,
};

// ─── Tests ───

describe('useTrips', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRandomUUID.mockReturnValue('mock-uuid-fixed');
  });

  describe('saveTrip', () => {
    it('should generate UUID and add createdAt for new trip', () => {
      setupState([], []);
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);

      const result = useTrips(mockT);
      const tripId = result.saveTrip(baseTripData, null);

      expect(tripId).toBe('mock-uuid-fixed');
      expect(setTrips).toHaveBeenCalled();

      // Execute the setter to verify the new trip
      const setter = setTrips.mock.calls[0][0];
      const newState = setter([]);
      expect(newState).toHaveLength(1);
      expect(newState[0].id).toBe('mock-uuid-fixed');
      expect(newState[0].createdAt).toBe(now);
      expect(newState[0].title).toBe('Roma');

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('should update existing trip without changing id or createdAt', () => {
      setupState([existingTrip], []);

      const result = useTrips(mockT);
      const tripId = result.saveTrip(
        { ...baseTripData, title: 'Roma Updated' },
        existingTrip,
      );

      expect(tripId).toBe('existing-id-1');
      expect(setTrips).toHaveBeenCalled();

      const setter = setTrips.mock.calls[0][0];
      const newState = setter([existingTrip]);
      expect(newState[0].id).toBe('existing-id-1');
      expect(newState[0].createdAt).toBe(1700000000000);
      expect(newState[0].title).toBe('Roma Updated');
    });

    it('should update itinerary.tripIds when trip has itineraryId', () => {
      setupState([existingTrip], [existingItinerary]);

      const result = useTrips(mockT);
      result.saveTrip(
        { ...baseTripData, itineraryId: 'itin-1' } as any,
        existingTrip,
      );

      // setItineraries should have been called to update the itinerary
      expect(setItineraries).toHaveBeenCalled();
      const setter = setItineraries.mock.calls[0][0];
      const newItins = setter([existingItinerary]);
      expect(newItins[0].tripIds).toContain('existing-id-1');
    });
  });

  describe('deleteTrip', () => {
    it('should remove trip from state', async () => {
      setupState([existingTrip, existingTripFav], []);

      const result = useTrips(mockT);
      await result.deleteTrip('existing-id-1');

      expect(setTrips).toHaveBeenCalled();
      const setter = setTrips.mock.calls[0][0];
      const newState = setter([existingTrip, existingTripFav]);
      expect(newState).toHaveLength(1);
      expect(newState[0].id).toBe('fav-trip-1');
    });
  });

  describe('toggleFavorite', () => {
    it('should toggle non-favorite trip to favorite', () => {
      setupState([existingTripNotFav], []);

      const result = useTrips(mockT);
      result.toggleFavorite('notfav-trip-1');

      expect(setTrips).toHaveBeenCalled();
      const setter = setTrips.mock.calls[0][0];
      const newState = setter([existingTripNotFav]);
      expect(newState[0].isFavorite).toBe(true);
    });

    it('should toggle favorite trip to non-favorite', () => {
      setupState([existingTripFav], []);

      const result = useTrips(mockT);
      result.toggleFavorite('fav-trip-1');

      expect(setTrips).toHaveBeenCalled();
      const setter = setTrips.mock.calls[0][0];
      const newState = setter([existingTripFav]);
      expect(newState[0].isFavorite).toBe(false);
    });
  });

  describe('Itinerari', () => {
    it('createItinerary should generate UUID and add to state', () => {
      const now = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(now);
      setupState([], []);

      const result = useTrips(mockT);
      const newItin = result.createItinerary('Viaggio Sicilia');

      expect(newItin.id).toBe('mock-uuid-fixed');
      expect(newItin.name).toBe('Viaggio Sicilia');
      expect(newItin.tripIds).toEqual([]);
      expect(newItin.createdAt).toBe(now);

      expect(setItineraries).toHaveBeenCalled();
      const setter = setItineraries.mock.calls[0][0];
      const newState = setter([]);
      expect(newState).toHaveLength(1);
      expect(newState[0].name).toBe('Viaggio Sicilia');

      jest.spyOn(Date, 'now').mockRestore();
    });

    it('deleteItinerary should remove itinerary and clear itineraryId from trips', () => {
      const tripInItin: Trip = { ...existingTrip, itineraryId: 'itin-1' };
      setupState([tripInItin], [existingItinerary]);

      const result = useTrips(mockT);
      result.deleteItinerary('itin-1');

      // Itinerary removed
      expect(setItineraries).toHaveBeenCalled();
      const itinSetter = setItineraries.mock.calls[0][0];
      const newItins = itinSetter([existingItinerary]);
      expect(newItins).toHaveLength(0);

      // Trip's itineraryId cleared
      expect(setTrips).toHaveBeenCalled();
      const tripSetter = setTrips.mock.calls[0][0];
      const newTrips = tripSetter([tripInItin]);
      expect(newTrips[0].itineraryId).toBeUndefined();
    });

    it('renameItinerary should update name', () => {
      setupState([], [existingItinerary]);

      const result = useTrips(mockT);
      result.renameItinerary('itin-1', 'Tour Toscana');

      expect(setItineraries).toHaveBeenCalled();
      const setter = setItineraries.mock.calls[0][0];
      const newState = setter([existingItinerary]);
      expect(newState[0].name).toBe('Tour Toscana');
      expect(newState[0].id).toBe('itin-1'); // id unchanged
    });
  });
});
