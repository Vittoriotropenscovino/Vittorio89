// Backups and marked countries: old files must import exactly as before, new
// files must carry the marked countries inside the checksum, and an app still on
// 1.2.x must be able to read a 1.3.0 backup. Real SHA-256 here (not a mock), so
// the checksum is actually verified.
import { createHash, randomUUID } from 'crypto';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn(), multiSet: jest.fn(),
}));
jest.mock('expo-file-system/legacy', () => ({ documentDirectory: '/mock/documents/' }));
jest.mock('expo-image-manipulator', () => ({ SaveFormat: { JPEG: 'jpeg' } }));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: (_alg: string, s: string) =>
    Promise.resolve(createHash('sha256').update(s).digest('hex')),
  randomUUID: () => randomUUID(),
}));

import { StorageService } from '../StorageService';
import { validateImportData, extractMarkedCountries } from '../../utils/validateTrip';
import { mergeCountryCodes } from '../../utils/countries';
import { Trip } from '../../types';

const trip: Trip = {
  id: 'trip-1', title: 'Roma', locationName: 'Roma, Italia', latitude: 41.9, longitude: 12.5,
  date: '2025-06-15', notes: '', media: [], createdAt: 1700000000000, countryCode: 'IT',
};
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/** Exactly what Settings → Import does with a file (validateBackup + the two extractors). */
const importFile = async (content: string, existingTrips: Trip[] = [], existingMarked: string[] = []) => {
  const { valid, data, hasChecksum } = await StorageService.validateBackup(content);
  const trips = validateImportData(data, existingTrips).trips;
  const marked = mergeCountryCodes(existingMarked, extractMarkedCountries(data));
  return { valid, hasChecksum, trips, marked };
};

describe('backup with marked countries', () => {
  it('a new backup holds the marked countries inside data, covered by the checksum', async () => {
    const backup = await StorageService.buildBackup([trip], [], ['JP', 'BR']);
    expect(backup.schemaVersion).toBe(3);
    expect(backup.data).toEqual({ trips: [trip], itineraries: [], markedCountries: ['JP', 'BR'] });
    expect(backup.checksum).toBe(sha(JSON.stringify(backup.data)));
  });

  it('a new backup round-trips: trips and marked countries come back, checksum valid', async () => {
    const backup = await StorageService.buildBackup([trip], [], ['JP', 'BR']);
    const result = await importFile(JSON.stringify(backup, null, 2));
    expect(result.valid).toBe(true);
    expect(result.hasChecksum).toBe(true);
    expect(result.trips).toHaveLength(1);
    expect(result.marked).toEqual({ merged: ['JP', 'BR'], added: 2 });
  });

  it('editing the marked countries in the file breaks the checksum', async () => {
    const backup = await StorageService.buildBackup([trip], [], ['JP']);
    const tampered = { ...backup, data: { ...backup.data, markedCountries: ['JP', 'US'] } };
    expect((await importFile(JSON.stringify(tampered))).valid).toBe(false);
  });

  it('importing merges with the countries already marked (nothing is lost)', async () => {
    const backup = await StorageService.buildBackup([], [], ['JP', 'IT']);
    const result = await importFile(JSON.stringify(backup), [], ['IT', 'FR']);
    expect(result.marked).toEqual({ merged: ['IT', 'FR', 'JP'], added: 1 });
  });

  it('only valid codes are kept from a file', async () => {
    const backup = await StorageService.buildBackup([], [], ['JP']);
    const raw = { ...backup, data: { ...backup.data, markedCountries: ['jp', 'XX', 42, 'JPN'] } };
    raw.checksum = sha(JSON.stringify(raw.data));
    expect((await importFile(JSON.stringify(raw))).marked.merged).toEqual(['JP']);
  });
});

describe('old backups import exactly as before', () => {
  it('1.2.x backup (schemaVersion 1, no markedCountries): valid, trips imported, no countries', async () => {
    const data = { trips: [trip], itineraries: [] };
    const old = { schemaVersion: 1, checksum: sha(JSON.stringify(data)), createdAt: '2026-10-01T10:00:00Z', data };
    const result = await importFile(JSON.stringify(old, null, 2));
    expect(result.valid).toBe(true);
    expect(result.trips).toHaveLength(1);
    expect(result.trips[0]).toMatchObject({ id: 'trip-1', countryCode: 'IT' });
    expect(result.marked).toEqual({ merged: [], added: 0 });
  });

  it('legacy backup without checksum ({ trips, exportDate, version }) still imports', async () => {
    const legacy = { trips: [trip], exportDate: '2024-01-01T00:00:00Z', version: '1.0' };
    const result = await importFile(JSON.stringify(legacy));
    expect(result.hasChecksum).toBe(false);
    expect(result.trips).toHaveLength(1);
    expect(result.marked.added).toBe(0);
  });

  it('an app still on 1.2.x can read a 1.3.0 backup: checksum valid, trips imported', async () => {
    // 1.2.x validateBackup hashes JSON.stringify(parsed.data) and reads data.trips:
    // the extra markedCountries key keeps its place after a JSON round trip.
    const backup = await StorageService.buildBackup([trip], [], ['JP']);
    const parsed = JSON.parse(JSON.stringify(backup, null, 2));
    expect(sha(JSON.stringify(parsed.data))).toBe(parsed.checksum);
    expect(validateImportData(parsed.data, []).trips).toHaveLength(1);
  });
});
