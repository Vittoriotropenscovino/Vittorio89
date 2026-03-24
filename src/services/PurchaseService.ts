import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { Platform } from 'react-native';

// RevenueCat API keys (configurare dopo creazione account RevenueCat)
const REVENUECAT_ANDROID_KEY = 'YOUR_ANDROID_KEY';
const REVENUECAT_IOS_KEY = 'YOUR_IOS_KEY';

const ENTITLEMENT_ID = 'premium';

class PurchaseService {
  private static initialized = false;

  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const apiKey = Platform.OS === 'ios'
        ? REVENUECAT_IOS_KEY
        : REVENUECAT_ANDROID_KEY;

      await Purchases.configure({ apiKey });
      this.initialized = true;
      console.log('[TravelSphere] RevenueCat initialized');
    } catch (error) {
      console.error('[TravelSphere] RevenueCat init failed:', error);
    }
  }

  static async isPremium(): Promise<boolean> {
    if (__DEV__) return true;

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error) {
      console.error('[TravelSphere] Check premium failed:', error);
      return false;
    }
  }

  static async getOfferings(): Promise<PurchasesPackage | null> {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current && offerings.current.availablePackages.length > 0) {
        return offerings.current.availablePackages[0];
      }
      return null;
    } catch (error) {
      console.error('[TravelSphere] Get offerings failed:', error);
      return null;
    }
  }

  static async purchase(): Promise<boolean> {
    try {
      const pkg = await this.getOfferings();
      if (!pkg) {
        console.error('[TravelSphere] No package available');
        return false;
      }

      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('[TravelSphere] Purchase cancelled by user');
        return false;
      }
      console.error('[TravelSphere] Purchase failed:', error);
      return false;
    }
  }

  static async restorePurchases(): Promise<boolean> {
    try {
      const customerInfo = await Purchases.restorePurchases();
      return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
    } catch (error) {
      console.error('[TravelSphere] Restore failed:', error);
      return false;
    }
  }
}

export default PurchaseService;
