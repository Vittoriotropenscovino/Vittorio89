/**
 * Shared geocoding utility using Nominatim (OpenStreetMap)
 */

export interface NominatimResult {
    lat: string;
    lon: string;
    display_name: string;
    address?: {
        country?: string;
        country_code?: string;
        city?: string;
        state?: string;
        town?: string;
        village?: string;
    };
}

export const geocodeWithNominatim = async (query: string): Promise<NominatimResult[]> => {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=it&addressdetails=1`,
        {
            headers: {
                'User-Agent': 'TravelSphere/1.0',
            },
        }
    );
    if (!response.ok) {
        throw new Error('Geocoding request failed');
    }
    return response.json();
};

export const extractCountryFromLocationName = (locationName: string): string => {
    const parts = locationName.split(',').map(s => s.trim());
    return parts[parts.length - 1] || 'Sconosciuto';
};
