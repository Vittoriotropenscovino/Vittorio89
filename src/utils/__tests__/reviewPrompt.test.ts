const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
  setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
}));
const mockRequest = jest.fn().mockResolvedValue(undefined);
const mockAvailable = jest.fn().mockResolvedValue(true);
jest.mock('expo-store-review', () => ({
  isAvailableAsync: (...a: unknown[]) => mockAvailable(...a),
  requestReview: (...a: unknown[]) => mockRequest(...a),
}));

import { requestReviewIfAppropriate, MAX_REVIEW_ATTEMPTS, MIN_DAYS_BETWEEN_ATTEMPTS } from '../reviewPrompt';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 24);

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
  mockRequest.mockClear();
  mockAvailable.mockResolvedValue(true);
});

describe('requestReviewIfAppropriate', () => {
  it('asks the first time', async () => {
    await requestReviewIfAppropriate(T0);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('does not ask again within the minimum gap', async () => {
    await requestReviewIfAppropriate(T0);
    await requestReviewIfAppropriate(T0 + (MIN_DAYS_BETWEEN_ATTEMPTS - 1) * DAY);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('retries after the gap, because Google may have silently skipped the dialog', async () => {
    await requestReviewIfAppropriate(T0);
    await requestReviewIfAppropriate(T0 + MIN_DAYS_BETWEEN_ATTEMPTS * DAY);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('never asks more than the maximum per install', async () => {
    for (let i = 0; i < MAX_REVIEW_ATTEMPTS + 3; i++) await requestReviewIfAppropriate(T0 + i * 40 * DAY);
    expect(mockRequest).toHaveBeenCalledTimes(MAX_REVIEW_ATTEMPTS);
  });

  it('counts the single attempt of v1.2.0 (old flag) as already spent', async () => {
    store.hasRequestedReview = 'true';
    for (let i = 0; i < MAX_REVIEW_ATTEMPTS + 2; i++) await requestReviewIfAppropriate(T0 + i * 40 * DAY);
    expect(mockRequest).toHaveBeenCalledTimes(MAX_REVIEW_ATTEMPTS - 1);
  });

  it('does not spend an attempt when the review API is not available', async () => {
    mockAvailable.mockResolvedValue(false);
    await requestReviewIfAppropriate(T0);
    mockAvailable.mockResolvedValue(true);
    await requestReviewIfAppropriate(T0 + DAY);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it('never throws', async () => {
    mockRequest.mockRejectedValueOnce(new Error('play services down'));
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(requestReviewIfAppropriate(T0)).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
