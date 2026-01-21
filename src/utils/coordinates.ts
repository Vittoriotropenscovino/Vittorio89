import * as THREE from 'three';
import { Coordinates } from '../types';

export const latLonToVector3 = (coords: Coordinates, radius: number): THREE.Vector3 => {
    const { latitude, longitude } = coords;
    const phi = (90 - latitude) * (Math.PI / 180);
    const theta = (longitude + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return new THREE.Vector3(x, y, z);
};

export const getGlobeRotationForCoords = (coords: Coordinates): [number, number, number] => {
    const { latitude, longitude } = coords;
    // Convert lat/lon to radians
    const latRad = latitude * (Math.PI / 180);
    const lonRad = longitude * (Math.PI / 180);

    // Calculate rotation to bring the coordinate to the front (0, 0, radius)
    // This depends on the initial orientation of your globe texture
    // Assuming texture starts with 0 rot at standard map position

    const yRotation = -lonRad - Math.PI / 2;
    const xRotation = latRad;

    return [xRotation, yRotation, 0];
};

export const lerp = (start: number, end: number, t: number): number => {
    return start * (1 - t) + end * t;
};
