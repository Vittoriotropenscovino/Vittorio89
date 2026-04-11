import { Trip, HomeLocation, ClusteredPin } from '../types';

const CLUSTER_RADIUS_KM = 30;

export function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function clusterTrips(trips: Trip[], homeLocation?: HomeLocation | null): ClusteredPin[] {
  if (!trips || trips.length === 0) return [];

  // Filter out invalid coordinates
  const validTrips = trips.filter((t) => {
    if (t.latitude === 0 && t.longitude === 0) return false;
    if (isNaN(t.latitude) || isNaN(t.longitude)) return false;
    return true;
  });

  const used = new Set<string>();
  const clusters: ClusteredPin[] = [];

  for (let i = 0; i < validTrips.length; i++) {
    if (used.has(validTrips[i].id)) continue;

    const group: Trip[] = [validTrips[i]];
    used.add(validTrips[i].id);

    // Transitive chain clustering: compare candidate with every member of group
    let added = true;
    while (added) {
      added = false;
      for (let j = 0; j < validTrips.length; j++) {
        if (used.has(validTrips[j].id)) continue;
        for (const member of group) {
          const dist = getDistanceKm(
            member.latitude, member.longitude,
            validTrips[j].latitude, validTrips[j].longitude
          );
          if (dist < CLUSTER_RADIUS_KM) {
            group.push(validTrips[j]);
            used.add(validTrips[j].id);
            added = true;
            break;
          }
        }
      }
    }

    let latitude: number;
    let longitude: number;
    let isCluster: boolean;
    let title: string;

    if (group.length === 1) {
      latitude = group[0].latitude;
      longitude = group[0].longitude;
      isCluster = false;
      title = group[0].title;
    } else {
      latitude = group.reduce((sum, t) => sum + t.latitude, 0) / group.length;
      longitude = group.reduce((sum, t) => sum + t.longitude, 0) / group.length;
      isCluster = true;
      title = `${group.length} trips`;
    }

    let distanceFromHomeKm = Infinity;
    if (homeLocation) {
      distanceFromHomeKm = getDistanceKm(
        homeLocation.latitude, homeLocation.longitude,
        latitude, longitude
      );
    }

    clusters.push({
      id: group[0].id,
      latitude,
      longitude,
      tripIds: group.map((t) => t.id),
      isCluster,
      isWishlist: group.every((t) => t.isWishlist === true),
      title,
      distanceFromHomeKm,
    });
  }

  return clusters;
}
