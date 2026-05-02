/**
 * Shared geocoding utility using Nominatim (OpenStreetMap)
 */

const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
};

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

export const geocodeWithNominatim = async (query: string, language = 'it'): Promise<NominatimResult[]> => {
    const response = await fetchWithTimeout(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=${language},en&addressdetails=1`,
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

export const reverseGeocodeCountry = async (lat: number, lon: number, language = 'en'): Promise<{ country: string; countryCode: string } | null> => {
    try {
        const response = await fetchWithTimeout(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=3&addressdetails=1&accept-language=${language},en`,
            { headers: { 'User-Agent': 'TravelSphere/1.0' } }
        );
        if (!response.ok) return null;
        const data = await response.json();
        if (data?.address) {
            return {
                country: data.address.country || '',
                countryCode: data.address.country_code?.toUpperCase() || '',
            };
        }
    } catch { /* ignore */ }
    return null;
};

export const extractCountryFromLocationName = (locationName: string): string => {
    const parts = locationName.split(',').map(s => s.trim());
    return parts[parts.length - 1] || '';
};
