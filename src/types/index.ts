// Trip Media Item
export interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    width?: number;
    height?: number;
}

// Trip/Memory Data
export interface Trip {
    id: string;
    title: string;
    locationName: string;
    latitude: number;
    longitude: number;
    date: string;
    media: MediaItem[];
    createdAt: number;
}

// Geocoding Result
export interface GeocodingResult {
    latitude: number;
    longitude: number;
    name?: string;
}

// Globe Pin Props
export interface PinProps {
    trip: Trip;
    onPress: (trip: Trip) => void;
    isSelected: boolean;
}

// Earth Globe Props
export interface EarthGlobeProps {
    trips: Trip[];
    onPinClick: (trip: Trip) => void;
    targetCoordinates?: Coordinates | null;
    autoRotate?: boolean;
}

// Trip Form Props
export interface TripFormProps {
    visible: boolean;
    onClose: () => void;
    onSave: (trip: Omit<Trip, 'id' | 'createdAt'>) => void;
}

// Memory Viewer Props
export interface MemoryViewerProps {
    trip: Trip | null;
    visible: boolean;
    onClose: () => void;
    onDelete?: (tripId: string) => void;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export const DEFAULT_GLOBE_CONFIG = {
    radius: 2,
    segments: 64,          // Valore iniziale
    segmentsMin: 32,       // Segmenti quando zoom è lontano
    segmentsMax: 128,      // Segmenti quando zoom è vicino (alta qualità)
    rotationSpeed: 0.0003,
    zoomMin: 1.5,          // Ridotto per permettere zoom molto ravvicinato e separare i pin
    zoomMax: 10,
};
