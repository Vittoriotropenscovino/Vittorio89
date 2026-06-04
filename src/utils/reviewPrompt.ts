import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const HAS_REQUESTED_REVIEW_KEY = 'hasRequestedReview';

/**
 * Ask for an in-app store review via the native Google dialog — non-invasive and
 * at most once per install. No custom "leave us a review" UI: only the native API
 * (Google rate-limits it, so it's normal for the dialog not to appear every time).
 *
 * Safe to call fire-and-forget: it never throws and never blocks the UI. Trigger
 * it only on a positive signal (e.g. a successful trip save reaching a milestone).
 */
export async function requestReviewIfAppropriate(): Promise<void> {
  try {
    const alreadyRequested = await AsyncStorage.getItem(HAS_REQUESTED_REVIEW_KEY);
    if (alreadyRequested) return;

    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      await AsyncStorage.setItem(HAS_REQUESTED_REVIEW_KEY, 'true');
    }
  } catch (e) {
    console.warn('[TravelSphere] requestReviewIfAppropriate failed', e);
  }
}
