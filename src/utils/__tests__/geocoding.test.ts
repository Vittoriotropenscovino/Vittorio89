// Mock global fetch
global.fetch = jest.fn();

import { geocodeWithNominatim, reverseGeocodeCountry, extractCountryFromLocationName } from '../geocoding';

describe('geocoding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('geocodeWithNominatim', () => {
    it('should return results on successful geocode', async () => {
      const mockResponse = [
        {
          lat: '41.9027835',
          lon: '12.4963655',
          display_name: 'Roma, Lazio, Italia',
          address: { country: 'Italia', country_code: 'it', city: 'Roma' },
        },
      ];
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await geocodeWithNominatim('Roma');
      expect(result).toHaveLength(1);
      expect(result[0].lat).toBe('41.9027835');
      expect(result[0].display_name).toContain('Roma');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('nominatim.openstreetmap.org/search'),
        expect.objectContaining({
          headers: { 'User-Agent': 'TravelSphere/1.0' },
        }),
      );
    });

    it('should throw on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
      });

      await expect(geocodeWithNominatim('Roma')).rejects.toThrow('Geocoding request failed');
    });

    it('should throw on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(geocodeWithNominatim('Roma')).rejects.toThrow('Network error');
    });
  });

  describe('reverseGeocodeCountry', () => {
    it('should return country info on success', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          address: { country: 'Italia', country_code: 'it' },
        }),
      });

      const result = await reverseGeocodeCountry(41.9, 12.5);
      expect(result).toEqual({ country: 'Italia', countryCode: 'IT' });
    });

    it('should return null on non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false });

      const result = await reverseGeocodeCountry(41.9, 12.5);
      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Offline'));

      const result = await reverseGeocodeCountry(41.9, 12.5);
      expect(result).toBeNull();
    });

    it('should return null when no address in response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await reverseGeocodeCountry(41.9, 12.5);
      expect(result).toBeNull();
    });
  });

  describe('extractCountryFromLocationName', () => {
    it('should extract last part as country', () => {
      expect(extractCountryFromLocationName('Roma, Lazio, Italia')).toBe('Italia');
    });

    it('should handle single-part names', () => {
      expect(extractCountryFromLocationName('Italia')).toBe('Italia');
    });

    it('should handle empty string', () => {
      expect(extractCountryFromLocationName('')).toBe('Sconosciuto');
    });
  });
});
