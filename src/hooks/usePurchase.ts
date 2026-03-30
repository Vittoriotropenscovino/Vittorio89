import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PurchaseService from '../services/PurchaseService';

const FREE_TRIP_LIMIT = 3;
const DEV_MODE_KEY = '@travelsphere_dev_mode';

export function usePurchase() {
  const [isPremium, setIsPremium] = useState(__DEV__);
  const [isLoading, setIsLoading] = useState(true);
  const [price, setPrice] = useState<string>('€3,49');

  useEffect(() => {
    async function init() {
      // Check dev mode flag from AsyncStorage
      const devModeFlag = await AsyncStorage.getItem(DEV_MODE_KEY);
      if (devModeFlag === 'true') {
        setIsPremium(true);
        setIsLoading(false);
        return;
      }

      await PurchaseService.initialize();

      const premium = await PurchaseService.isPremium();
      setIsPremium(premium);

      const pkg = await PurchaseService.getOfferings();
      if (pkg) {
        setPrice(pkg.product.priceString);
      }

      setIsLoading(false);
    }
    init();
  }, []);

  const purchase = useCallback(async (): Promise<boolean> => {
    const success = await PurchaseService.purchase();
    if (success) {
      setIsPremium(true);
    }
    return success;
  }, []);

  const restore = useCallback(async (): Promise<boolean> => {
    const success = await PurchaseService.restorePurchases();
    if (success) {
      setIsPremium(true);
    }
    return success;
  }, []);

  const canAddTrip = useCallback((currentTripCount: number): boolean => {
    if (__DEV__) return true;
    if (isPremium) return true;
    return currentTripCount < FREE_TRIP_LIMIT;
  }, [isPremium]);

  const remainingFreeTrips = useCallback((currentTripCount: number): number => {
    if (isPremium) return Infinity;
    return Math.max(0, FREE_TRIP_LIMIT - currentTripCount);
  }, [isPremium]);

  const setDevMode = useCallback((enabled: boolean) => {
    setIsPremium(enabled || __DEV__);
  }, []);

  return {
    isPremium,
    isLoading,
    price,
    purchase,
    restore,
    canAddTrip,
    remainingFreeTrips,
    FREE_TRIP_LIMIT,
    setDevMode,
  };
}
