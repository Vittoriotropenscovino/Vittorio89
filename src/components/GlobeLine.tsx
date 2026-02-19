import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Coordinates } from '../types';
import { latLonToVector3 } from '../utils/coordinates';

interface GlobeLineProps {
    from: Coordinates;
    to: Coordinates;
    radius: number;
    color?: string;
    opacity?: number;
    elevated?: boolean;
}

/**
 * Creates arc points between two coordinates on the globe surface.
 * Uses spherical interpolation with a parabolic elevation for visibility.
 */
const createArcPoints = (
    from: Coordinates,
    to: Coordinates,
    radius: number,
    segments: number = 50,
    elevated: boolean = true,
): THREE.Vector3[] => {
    const start = latLonToVector3(from, radius);
    const end = latLonToVector3(to, radius);
    const points: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
        const t = i / segments;

        // Spherical interpolation (slerp-like) for great circle path
        const point = new THREE.Vector3().lerpVectors(start, end, t).normalize();

        // Elevation: parabolic arc above the surface for visibility
        const elevation = elevated
            ? 1 + 0.06 * Math.sin(Math.PI * t)
            : 1 + 0.01;

        point.multiplyScalar(radius * elevation);
        points.push(point);
    }

    return points;
};

const GlobeLine: React.FC<GlobeLineProps> = ({
    from,
    to,
    radius,
    color = '#60A5FA',
    opacity = 0.6,
    elevated = true,
}) => {
    const geometry = useMemo(() => {
        const points = createArcPoints(from, to, radius, 50, elevated);
        return new THREE.BufferGeometry().setFromPoints(points);
    }, [from.latitude, from.longitude, to.latitude, to.longitude, radius, elevated]);

    return (
        <line geometry={geometry}>
            <lineBasicMaterial
                color={color}
                transparent
                opacity={opacity}
            />
        </line>
    );
};

export default GlobeLine;
