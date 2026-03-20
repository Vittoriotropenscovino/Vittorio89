import { Trip, MediaItem, TripTag } from '../types';
import * as Crypto from 'expo-crypto';

const VALID_TAGS: ReadonlySet<string> = new Set<TripTag>([
  'sea', 'mountain', 'city', 'adventure', 'culture', 'food', 'nature', 'romantic',
]);

const VALID_MEDIA_TYPES: ReadonlySet<string> = new Set(['image', 'video']);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Trip;
}

export interface ImportResult {
  trips: Trip[];
  skipped: number;
  errors: string[];
}

function validateMediaItem(item: unknown): item is MediaItem {
  if (!item || typeof item !== 'object') return false;
  const m = item as Record<string, unknown>;
  if (typeof m.uri !== 'string' || m.uri.length === 0) return false;
  if (!VALID_MEDIA_TYPES.has(m.type as string)) return false;
  if (m.width !== undefined && typeof m.width !== 'number') return false;
  if (m.height !== undefined && typeof m.height !== 'number') return false;
  return true;
}

function isValidTag(tag: unknown): tag is TripTag {
  return typeof tag === 'string' && VALID_TAGS.has(tag);
}

export function validateTrip(data: unknown): ValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Trip is not an object'] };
  }

  const trip = data as Record<string, unknown>;

  // Required fields
  if (typeof trip.id !== 'string' || trip.id.length === 0) errors.push('id missing or invalid');
  if (typeof trip.title !== 'string' || trip.title.length === 0) errors.push('title missing');
  if (typeof trip.locationName !== 'string') errors.push('locationName missing');
  if (typeof trip.latitude !== 'number' || isNaN(trip.latitude) || trip.latitude < -90 || trip.latitude > 90) {
    errors.push('latitude invalid');
  }
  if (typeof trip.longitude !== 'number' || isNaN(trip.longitude) || trip.longitude < -180 || trip.longitude > 180) {
    errors.push('longitude invalid');
  }
  if (typeof trip.date !== 'string') errors.push('date missing');
  if (typeof trip.createdAt !== 'number' || isNaN(trip.createdAt)) errors.push('createdAt missing or invalid');

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Build sanitized trip with defaults for optional fields
  const sanitized: Trip = {
    id: trip.id as string,
    title: trip.title as string,
    locationName: trip.locationName as string,
    latitude: trip.latitude as number,
    longitude: trip.longitude as number,
    date: trip.date as string,
    createdAt: trip.createdAt as number,
    notes: typeof trip.notes === 'string' ? trip.notes : '',
    media: Array.isArray(trip.media) ? trip.media.filter(validateMediaItem) : [],
    tags: Array.isArray(trip.tags) ? trip.tags.filter(isValidTag) : [],
    isFavorite: typeof trip.isFavorite === 'boolean' ? trip.isFavorite : false,
    isWishlist: typeof trip.isWishlist === 'boolean' ? trip.isWishlist : false,
    country: typeof trip.country === 'string' ? trip.country : undefined,
    countryCode: typeof trip.countryCode === 'string' ? trip.countryCode : undefined,
    itineraryId: typeof trip.itineraryId === 'string' ? trip.itineraryId : undefined,
    showArc: typeof trip.showArc === 'boolean' ? trip.showArc : undefined,
  };

  return { valid: true, errors: [], sanitized };
}

function isTripDuplicate(a: Trip, b: Trip): boolean {
  return a.title === b.title &&
    a.locationName === b.locationName &&
    a.latitude === b.latitude &&
    a.longitude === b.longitude &&
    a.date === b.date;
}

function extractTripsArray(json: unknown): unknown[] | null {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    // { trips: [...] }
    if (Array.isArray(obj.trips)) return obj.trips;
    // { data: { trips: [...] } } (new backup format)
    if (obj.data && typeof obj.data === 'object') {
      const data = obj.data as Record<string, unknown>;
      if (Array.isArray(data.trips)) return data.trips;
    }
  }
  return null;
}

export function validateImportData(json: unknown, existingTrips: Trip[]): ImportResult {
  const raw = extractTripsArray(json);
  if (!raw) {
    return { trips: [], skipped: 0, errors: ['No trips array found in import data'] };
  }

  const existingById = new Map(existingTrips.map((t) => [t.id, t]));
  const validTrips: Trip[] = [];
  let skipped = 0;
  const allErrors: string[] = [];

  for (const item of raw) {
    const result = validateTrip(item);

    if (!result.valid || !result.sanitized) {
      skipped++;
      const label = (item && typeof item === 'object' && 'id' in item) ? (item as Record<string, unknown>).id : 'unknown';
      console.warn('[TravelSphere] Import: trip skipped', { id: label, errors: result.errors });
      allErrors.push(...result.errors);
      continue;
    }

    const sanitized = result.sanitized;
    const existing = existingById.get(sanitized.id);

    if (existing) {
      if (isTripDuplicate(existing, sanitized)) {
        // Exact duplicate — skip silently
        skipped++;
        continue;
      }
      // ID conflict with different data — assign new ID
      sanitized.id = Crypto.randomUUID();
    }

    validTrips.push(sanitized);
  }

  return { trips: validTrips, skipped, errors: allErrors };
}
