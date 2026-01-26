import { latLonToVector3, getGlobeRotationForCoords, lerp } from '../src/utils/coordinates';

describe('Coordinate Utilities', () => {
    describe('latLonToVector3', () => {
        it('should convert lat/lon to 3D vector', () => {
            const coords = { latitude: 0, longitude: 0 };
            const radius = 2;

            const result = latLonToVector3(coords, radius);

            expect(result).toBeDefined();
            expect(typeof result.x).toBe('number');
            expect(typeof result.y).toBe('number');
            expect(typeof result.z).toBe('number');
        });

        it('should produce vector with correct magnitude', () => {
            const coords = { latitude: 45, longitude: 90 };
            const radius = 2;

            const result = latLonToVector3(coords, radius);
            const magnitude = Math.sqrt(
                result.x ** 2 + result.y ** 2 + result.z ** 2
            );

            expect(magnitude).toBeCloseTo(radius, 5);
        });

        it('should place north pole at top (positive y)', () => {
            const northPole = { latitude: 90, longitude: 0 };
            const radius = 1;

            const result = latLonToVector3(northPole, radius);

            expect(result.y).toBeCloseTo(radius, 5);
            expect(result.x).toBeCloseTo(0, 5);
            expect(result.z).toBeCloseTo(0, 5);
        });

        it('should place south pole at bottom (negative y)', () => {
            const southPole = { latitude: -90, longitude: 0 };
            const radius = 1;

            const result = latLonToVector3(southPole, radius);

            expect(result.y).toBeCloseTo(-radius, 5);
        });
    });

    describe('getGlobeRotationForCoords', () => {
        it('should return rotation array with 3 elements', () => {
            const coords = { latitude: 41.9, longitude: 12.5 };

            const result = getGlobeRotationForCoords(coords);

            expect(result).toHaveLength(3);
            expect(typeof result[0]).toBe('number');
            expect(typeof result[1]).toBe('number');
            expect(typeof result[2]).toBe('number');
        });

        it('should return zero z rotation', () => {
            const coords = { latitude: 0, longitude: 0 };

            const result = getGlobeRotationForCoords(coords);

            expect(result[2]).toBe(0);
        });

        it('should handle negative coordinates', () => {
            const coords = { latitude: -33.9, longitude: -118.4 };

            const result = getGlobeRotationForCoords(coords);

            expect(result[0]).toBeLessThan(0); // Southern hemisphere
        });
    });

    describe('lerp', () => {
        it('should return start value when t is 0', () => {
            const result = lerp(0, 100, 0);
            expect(result).toBe(0);
        });

        it('should return end value when t is 1', () => {
            const result = lerp(0, 100, 1);
            expect(result).toBe(100);
        });

        it('should return middle value when t is 0.5', () => {
            const result = lerp(0, 100, 0.5);
            expect(result).toBe(50);
        });

        it('should interpolate correctly for any t', () => {
            const result = lerp(10, 30, 0.25);
            expect(result).toBe(15);
        });

        it('should handle negative values', () => {
            const result = lerp(-100, 100, 0.5);
            expect(result).toBe(0);
        });
    });
});
