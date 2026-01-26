import AsyncStorage from '@react-native-async-storage/async-storage';
import StorageService from '../src/services/StorageService';
import { Trip } from '../src/types';

describe('StorageService', () => {
    const mockTrip: Trip = {
        id: 'test-123',
        title: 'Test Trip',
        locationName: 'Roma, Italia',
        latitude: 41.9028,
        longitude: 12.4964,
        date: '2024-01-15',
        media: [],
        createdAt: Date.now(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('saveTrips', () => {
        it('should save trips to AsyncStorage', async () => {
            const trips = [mockTrip];

            await StorageService.saveTrips(trips);

            expect(AsyncStorage.setItem).toHaveBeenCalledWith(
                '@travelsphere_trips',
                JSON.stringify(trips)
            );
        });

        it('should throw error if save fails', async () => {
            (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(
                new Error('Storage error')
            );

            await expect(StorageService.saveTrips([mockTrip])).rejects.toThrow(
                'Storage error'
            );
        });
    });

    describe('loadTrips', () => {
        it('should load trips from AsyncStorage', async () => {
            const trips = [mockTrip];
            (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
                JSON.stringify(trips)
            );

            const result = await StorageService.loadTrips();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('@travelsphere_trips');
            expect(result).toEqual(trips);
        });

        it('should return empty array if no data', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

            const result = await StorageService.loadTrips();

            expect(result).toEqual([]);
        });

        it('should return empty array on error', async () => {
            (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
                new Error('Load error')
            );

            const result = await StorageService.loadTrips();

            expect(result).toEqual([]);
        });
    });

    describe('deleteTrip', () => {
        it('should delete trip and return updated list', async () => {
            const trips = [mockTrip, { ...mockTrip, id: 'test-456' }];

            const result = await StorageService.deleteTrip('test-123', trips);

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('test-456');
        });

        it('should save updated trips after deletion', async () => {
            const trips = [mockTrip];

            await StorageService.deleteTrip('test-123', trips);

            expect(AsyncStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('clearAll', () => {
        it('should remove all data from storage', async () => {
            await StorageService.clearAll();

            expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@travelsphere_trips');
        });
    });
});
