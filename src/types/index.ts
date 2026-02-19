// Trip Media Item
export interface MediaItem {
    uri: string;
    type: 'image' | 'video';
    width?: number;
    height?: number;
}

// Home Location
export interface HomeLocation {
    latitude: number;
    longitude: number;
    locationName: string;
}

// Itinerary grouping
export interface Itinerary {
    id: string;
    name: string;
    tripIds: string[];
    createdAt: number;
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
    // Optional fields for itinerary and country grouping
    itineraryId?: string;
    itineraryOrder?: number;
    country?: string;
    countryCode?: string;
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

// Home Pin Props
export interface HomePinProps {
    homeLocation: HomeLocation;
    radius: number;
}

// Globe Line Props
export interface GlobeLineProps {
    from: Coordinates;
    to: Coordinates;
    radius: number;
    color?: string;
    opacity?: number;
}

// Earth Globe Props
export interface EarthGlobeProps {
    trips: Trip[];
    onPinClick: (trip: Trip) => void;
    targetCoordinates?: Coordinates | null;
    autoRotate?: boolean;
    homeLocation?: HomeLocation | null;
    itineraries?: Itinerary[];
}

// Trip Form Props
export interface TripFormProps {
    visible: boolean;
    onClose: () => void;
    onSave: (trip: Omit<Trip, 'id' | 'createdAt'>, itineraryInfo?: {
        itineraryId?: string;
        newItineraryName?: string;
    }) => void;
    itineraries?: Itinerary[];
}

// Memory Viewer Props
export interface MemoryViewerProps {
    trip: Trip | null;
    visible: boolean;
    onClose: () => void;
    onDelete?: (tripId: string) => void;
    onShare?: (trip: Trip) => void;
}

// Share Modal Props
export interface ShareModalProps {
    trip: Trip | null;
    visible: boolean;
    onClose: () => void;
}

// Settings Screen Props
export interface SettingsScreenProps {
    visible: boolean;
    onClose: () => void;
    homeLocation: HomeLocation | null;
    onSetHome: (home: HomeLocation) => void;
    onClearData: () => void;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export const DEFAULT_GLOBE_CONFIG = {
    radius: 2,
    segments: 64,
    segmentsMin: 32,
    segmentsMax: 192,
    rotationSpeed: 0.0003,
    zoomMin: 1.2,
    zoomMax: 12,
};
