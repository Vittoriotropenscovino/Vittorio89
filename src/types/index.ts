// Trip Tags
export type TripTag = 'sea' | 'mountain' | 'city' | 'adventure' | 'culture' | 'food' | 'nature' | 'romantic';

// Trip Media Item
export interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    width?: number;
    height?: number;
    thumbnailUri?: string;
}

// Trip/Memory Data
export interface Trip {
    id: string;
    title: string;
    locationName: string;
    latitude: number;
    longitude: number;
    date: string;
    notes: string;
    media: MediaItem[];
    createdAt: number;
    isFavorite?: boolean;
    tags?: TripTag[];
    country?: string;
    countryCode?: string;
    itineraryId?: string;
    showArc?: boolean;
    isWishlist?: boolean;
}

// Itinerary - connects multiple trips
export interface Itinerary {
    id: string;
    name: string;
    tripIds: string[];
    createdAt: number;
}

// Geocoding Result
export interface GeocodingResult {
    latitude: number;
    longitude: number;
    name?: string;
}

// Home Location
export interface HomeLocation {
    latitude: number;
    longitude: number;
    name: string;
}

// Clustered Pin - group of nearby trips represented as a single pin
export interface ClusteredPin {
    id: string;
    latitude: number;
    longitude: number;
    tripIds: string[];
    isCluster: boolean;
    isWishlist: boolean;
    showArc: boolean;
    title: string;
    distanceFromHomeKm: number;
}

// Earth Globe Props
export interface EarthGlobeProps {
    trips: Trip[];
    clusteredPins: ClusteredPin[];
    onPinClick: (trip: Trip, clusterTrips?: Trip[]) => void;
    targetCoordinates?: Coordinates | null;
    autoRotate?: boolean;
    homeLocation?: HomeLocation | null;
    itineraries?: Itinerary[];
    showTravelLines?: boolean;
    visitedCountries?: string[];
    flythroughStops?: { lat: number; lng: number }[] | null;
}

// Trip Form Props - supports both create and edit mode
export interface TripFormProps {
    visible: boolean;
    onClose: () => void;
    onSave: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
    editTrip?: Trip | null;
}

// Memory Viewer Props
export interface MemoryViewerProps {
    trip: Trip | null;
    visible: boolean;
    onClose: () => void;
    onDelete?: (tripId: string) => void;
    onEdit?: (trip: Trip) => void;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

// Tag metadata
export const TAG_CONFIG: Record<TripTag, { icon: string; color: string }> = {
    sea: { icon: 'water-outline', color: '#06B6D4' },
    mountain: { icon: 'trail-sign-outline', color: '#10B981' },
    city: { icon: 'business-outline', color: '#8B5CF6' },
    adventure: { icon: 'compass-outline', color: '#F59E0B' },
    culture: { icon: 'library-outline', color: '#EC4899' },
    food: { icon: 'restaurant-outline', color: '#EF4444' },
    nature: { icon: 'leaf-outline', color: '#22C55E' },
    romantic: { icon: 'heart-outline', color: '#F43F5E' },
};
