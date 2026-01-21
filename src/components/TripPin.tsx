import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Trip } from '../types';
import { latLonToVector3 } from '../utils/coordinates';

interface TripPinProps {
    trip: Trip;
    onClick: (trip: Trip) => void;
    radius: number;
}

const TripPin: React.FC<TripPinProps> = ({ trip, onClick, radius }) => {
    const groupRef = useRef<THREE.Group>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);

    // Calculate position
    const position = useMemo(() => {
        return latLonToVector3(
            { latitude: trip.latitude, longitude: trip.longitude },
            radius
        );
    }, [trip.latitude, trip.longitude, radius]);

    // Animation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.lookAt(0, 0, 0);
        }

        const t = state.clock.elapsedTime;

        // Gentle float for the head
        if (coreRef.current) {
            coreRef.current.position.z = 0.05 + Math.sin(t * 2) * 0.005;
        }

        // Subtle pulse for the ring
        if (ringRef.current) {
            const scale = 1 + Math.sin(t * 3) * 0.1;
            ringRef.current.scale.set(scale, scale, 1);

            if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
                ringRef.current.material.opacity = 0.3 + Math.sin(t * 3) * 0.1;
            }
        }
    });

    return (
        <group position={position} ref={groupRef} onClick={(e) => {
            e.stopPropagation();
            onClick(trip);
        }}>
            {/* 1. The Head: Elegant Red Sphere - Enlarged for visibility */}
            <mesh ref={coreRef} position={[0, 0, 0.12]}>
                <sphereGeometry args={[0.06, 32, 32]} />
                <meshStandardMaterial
                    color="#EF4444"
                    emissive="#7F1D1D"
                    emissiveIntensity={0.5}
                    roughness={0.2}
                    metalness={0.8}
                />
            </mesh>

            {/* 2. The Stem: Thicker line for visibility */}
            <mesh position={[0, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.12, 8]} />
                <meshBasicMaterial
                    color="#EF4444"
                    transparent
                    opacity={0.8}
                />
            </mesh>

            {/* 3. The Base: Larger Ring for visibility */}
            <mesh ref={ringRef} position={[0, 0, 0.003]}>
                <ringGeometry args={[0.04, 0.06, 32]} />
                <meshBasicMaterial
                    color="#EF4444"
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* 4. Hit Box (Invisible) - Larger for easier clicking */}
            <mesh position={[0, 0, 0.08]} visible={false}>
                <sphereGeometry args={[0.12, 8, 8]} />
                <meshBasicMaterial color="red" />
            </mesh>
        </group>
    );
};

export default TripPin;
