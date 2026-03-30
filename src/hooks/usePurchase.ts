import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PurchaseService from '../services/PurchaseService';

const FREE_TRIP_LIMIT = 3;
const DEV_MODE_KEY = '@travelsphere_dev_mode';

export function usePurchase() {
  const [isPremium, setIsPremium] = useState(false);
  const [isDevMode, setIsDevModeState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [price, setPrice] = useState<string>('€3,49');

  useEffect(() => {
    async function init() {
      // Check dev mode flag from AsyncStorage
      const devModeFlag = await AsyncStorage.getItem(DEV_MODE_KEY);
      if (devModeFlag === 'true') {
        setIsDevModeState(true);
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

  // Re-check dev mode when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState) => {
      if (nextState === 'active') {
        const devModeFlag = await AsyncStorage.getItem(DEV_MODE_KEY);
        setIsDevModeState(devModeFlag === 'true');
      }
    });
    return () => subscription.remove();
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
    if (isDevMode) return true;
    if (isPremium) return true;
    return currentTripCount < FREE_TRIP_LIMIT;
  }, [isPremium, isDevMode]);

  const remainingFreeTrips = useCallback((currentTripCount: number): number => {
    if (isPremium || isDevMode) return Infinity;
    return Math.max(0, FREE_TRIP_LIMIT - currentTripCount);
  }, [isPremium, isDevMode]);

  const setDevMode = useCallback(async (enabled: boolean) => {
    setIsDevModeState(enabled);
    await AsyncStorage.setItem(DEV_MODE_KEY, enabled ? 'true' : 'false');
  }, []);

  return {
    isPremium: isPremium || isDevMode,
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
