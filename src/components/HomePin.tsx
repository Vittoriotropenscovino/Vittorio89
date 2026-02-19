import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HomeLocation } from '../types';
import { latLonToVector3 } from '../utils/coordinates';

interface HomePinProps {
    homeLocation: HomeLocation;
    radius: number;
}

const HomePin: React.FC<HomePinProps> = ({ homeLocation, radius }) => {
    const groupRef = useRef<THREE.Group>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const ringRef = useRef<THREE.Mesh>(null);
    const glowRef = useRef<THREE.Mesh>(null);

    const position = React.useMemo(() => {
        return latLonToVector3(
            { latitude: homeLocation.latitude, longitude: homeLocation.longitude },
            radius
        );
    }, [homeLocation.latitude, homeLocation.longitude, radius]);

    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.lookAt(0, 0, 0);
        }

        const t = state.clock.elapsedTime;

        // Gentle float for the head
        if (headRef.current) {
            headRef.current.position.z = 0.06 + Math.sin(t * 1.5) * 0.008;
            headRef.current.rotation.z = t * 0.5;
        }

        // Pulsing ring
        if (ringRef.current) {
            const scale = 1 + Math.sin(t * 2) * 0.15;
            ringRef.current.scale.set(scale, scale, 1);
            if (ringRef.current.material instanceof THREE.MeshBasicMaterial) {
                ringRef.current.material.opacity = 0.4 + Math.sin(t * 2) * 0.15;
            }
        }

        // Glow pulse
        if (glowRef.current) {
            const glowScale = 1 + Math.sin(t * 1.5) * 0.2;
            glowRef.current.scale.set(glowScale, glowScale, 1);
            if (glowRef.current.material instanceof THREE.MeshBasicMaterial) {
                glowRef.current.material.opacity = 0.15 + Math.sin(t * 1.5) * 0.1;
            }
        }
    });

    return (
        <group position={position} ref={groupRef}>
            {/* Diamond/Octahedron head - gold/amber */}
            <mesh ref={headRef} position={[0, 0, 0.14]}>
                <octahedronGeometry args={[0.06, 0]} />
                <meshStandardMaterial
                    color="#F59E0B"
                    emissive="#92400E"
                    emissiveIntensity={0.6}
                    roughness={0.15}
                    metalness={0.9}
                />
            </mesh>

            {/* Stem - blue */}
            <mesh position={[0, 0, 0.07]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.006, 0.01, 0.14, 8]} />
                <meshBasicMaterial
                    color="#3B82F6"
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Base ring - blue, larger than trip pins */}
            <mesh ref={ringRef} position={[0, 0, 0.003]}>
                <ringGeometry args={[0.05, 0.08, 32]} />
                <meshBasicMaterial
                    color="#60A5FA"
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Outer glow ring */}
            <mesh ref={glowRef} position={[0, 0, 0.002]}>
                <ringGeometry args={[0.08, 0.12, 32]} />
                <meshBasicMaterial
                    color="#F59E0B"
                    transparent
                    opacity={0.15}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Hit box (invisible) */}
            <mesh position={[0, 0, 0.08]} visible={false}>
                <sphereGeometry args={[0.14, 8, 8]} />
                <meshBasicMaterial color="gold" />
            </mesh>
        </group>
    );
};

export default HomePin;
