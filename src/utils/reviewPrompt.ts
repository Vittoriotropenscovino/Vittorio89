import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/** Old flag (v1.2.0): set after the first and only attempt. */
const LEGACY_REQUESTED_KEY = 'hasRequestedReview';
/** Attempt log: { count, last } — how many times we asked and when (ms). */
const REVIEW_STATE_KEY = 'reviewPromptState';

/** Never ask more than this many times per install. */
export const MAX_REVIEW_ATTEMPTS = 3;
/** Minimum gap between two attempts. */
export const MIN_DAYS_BETWEEN_ATTEMPTS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

type ReviewState = { count: number; last: number };

async function loadState(): Promise<ReviewState> {
  const raw = await AsyncStorage.getItem(REVIEW_STATE_KEY);
  if (raw) {
    try {
      const s = JSON.parse(raw);
      if (typeof s?.count === 'number' && typeof s?.last === 'number') return s;
    } catch { /* corrupt value: start over below */ }
  }
  // Users who got the single v1.2.0 attempt: one attempt spent, date unknown.
  if (await AsyncStorage.getItem(LEGACY_REQUESTED_KEY)) return { count: 1, last: 0 };
  return { count: 0, last: 0 };
}

/**
 * Ask for an in-app store review via the native Google dialog (stars inside the app,
 * no trip to the store). Call it only on a positive moment: a new trip reaching the
 * 3-trip milestone, or right after the user shared their globe.
 *
 * Google decides by itself whether the dialog really shows (it rate-limits it and
 * tells the app nothing), so a single attempt can be silently wasted. That is why we
 * retry on later happy moments: at most MAX_REVIEW_ATTEMPTS times per install and
 * never twice within MIN_DAYS_BETWEEN_ATTEMPTS. No custom "rate us" screen, no
 * rewards: only the official API, as Google's policy requires.
 *
 * Safe to call fire-and-forget: it never throws and never blocks the UI.
 */
export async function requestReviewIfAppropriate(now: number = Date.now()): Promise<void> {
  try {
    const state = await loadState();
    if (state.count >= MAX_REVIEW_ATTEMPTS) return;
    if (state.count > 0 && now - state.last < MIN_DAYS_BETWEEN_ATTEMPTS * DAY_MS) return;

    if (await StoreReview.isAvailableAsync()) {
      await StoreReview.requestReview();
      await AsyncStorage.setItem(REVIEW_STATE_KEY, JSON.stringify({ count: state.count + 1, last: now }));
    }
  } catch (e) {
    console.warn('[TravelSphere] requestReviewIfAppropriate failed', e);
  }
}
