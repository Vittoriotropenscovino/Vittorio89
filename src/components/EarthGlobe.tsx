/**
 * TravelSphere - EarthGlobe Component
 * Globo 3D stilizzato senza texture esterne (compatibile Android)
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Trip, Coordinates, DEFAULT_GLOBE_CONFIG } from '../types';
import { latLonToVector3, getGlobeRotationForCoords, lerp } from '../utils/coordinates';
import TripPin from './TripPin';

interface EarthGlobeProps {
    trips: Trip[];
    onPinClick: (trip: Trip) => void;
    targetCoordinates?: Coordinates | null;
    autoRotate?: boolean;
}

// Calcola il numero di segmenti in base alla distanza della camera
function calculateSegments(cameraDistance: number): number {
    const { zoomMin, zoomMax, segmentsMin, segmentsMax } = DEFAULT_GLOBE_CONFIG;
    const normalized = 1 - (cameraDistance - zoomMin) / (zoomMax - zoomMin);
    const clamped = Math.max(0, Math.min(1, normalized));
    return Math.round(segmentsMin + clamped * (segmentsMax - segmentsMin));
}

// Componente interno per la Terra stilizzata
function Earth({
    trips,
    onPinClick,
    targetCoordinates,
    autoRotate = true,
}: EarthGlobeProps) {
    const earthRef = useRef<THREE.Group>(null);
    const globeRef = useRef<THREE.Mesh>(null);
    const targetRotation = useRef<[number, number, number] | null>(null);
    const isAnimating = useRef(false);
    const animationProgress = useRef(0);
    const startRotation = useRef<[number, number, number]>([0, 0, 0]);

    const [currentSegments, setCurrentSegments] = useState(DEFAULT_GLOBE_CONFIG.segments);
    const lastSegmentUpdate = useRef(0);

    const { camera } = useThree();
    const { radius, rotationSpeed } = DEFAULT_GLOBE_CONFIG;

    // Effetto per gestire la rotazione verso le coordinate target
    useEffect(() => {
        if (targetCoordinates && earthRef.current) {
            const newRotation = getGlobeRotationForCoords(targetCoordinates);
            targetRotation.current = newRotation;
            startRotation.current = [
                earthRef.current.rotation.x,
                earthRef.current.rotation.y,
                earthRef.current.rotation.z,
            ];
            isAnimating.current = true;
            animationProgress.current = 0;
        }
    }, [targetCoordinates]);

    // Animazione frame-by-frame
    useFrame((state, delta) => {
        if (!earthRef.current) return;

        const cameraDistance = camera.position.length();
        const now = state.clock.elapsedTime;

        if (now - lastSegmentUpdate.current > 0.5) {
            const newSegments = calculateSegments(cameraDistance);
            if (newSegments !== currentSegments) {
                setCurrentSegments(newSegments);
            }
            lastSegmentUpdate.current = now;
        }

        if (isAnimating.current && targetRotation.current) {
            animationProgress.current += delta * 0.5;
            const t = Math.min(animationProgress.current, 1);
            const smoothT = t * t * (3 - 2 * t);

            earthRef.current.rotation.x = lerp(startRotation.current[0], targetRotation.current[0], smoothT);
            earthRef.current.rotation.y = lerp(startRotation.current[1], targetRotation.current[1], smoothT);

            if (t >= 1) {
                isAnimating.current = false;
                targetRotation.current = null;
            }
        } else if (autoRotate && !isAnimating.current) {
            earthRef.current.rotation.y += rotationSpeed;
        }
    });

    // Materiale Earth stilizzato (gradiente blu-verde)
    const earthMaterial = useMemo(() => {
        return new THREE.MeshPhongMaterial({
            color: new THREE.Color('#1a4a7a'),
            emissive: new THREE.Color('#0a2040'),
            emissiveIntensity: 0.3,
            specular: new THREE.Color('#4a9eff'),
            shininess: 30,
        });
    }, []);

    // Materiale per l'atmosfera
    const atmosphereMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color('#4a9eff'),
            transparent: true,
            opacity: 0.15,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
    }, []);

    // Geometrie
    const earthGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius, currentSegments, currentSegments);
    }, [radius, currentSegments]);

    const atmosphereGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius * 1.08, 32, 32);
    }, [radius]);

    // Crea le linee di griglia (continenti stilizzati)
    const gridLines = useMemo(() => {
        const lines: THREE.BufferGeometry[] = [];

        // Paralleli (latitudine)
        for (let lat = -60; lat <= 60; lat += 30) {
            const points: THREE.Vector3[] = [];
            for (let lon = 0; lon <= 360; lon += 5) {
                const pos = latLonToVector3({ latitude: lat, longitude: lon }, radius + 0.01);
                points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
            }
            lines.push(new THREE.BufferGeometry().setFromPoints(points));
        }

        // Meridiani (longitudine)
        for (let lon = 0; lon < 360; lon += 30) {
            const points: THREE.Vector3[] = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                const pos = latLonToVector3({ latitude: lat, longitude: lon }, radius + 0.01);
                points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
            }
            lines.push(new THREE.BufferGeometry().setFromPoints(points));
        }

        return lines;
    }, [radius]);

    // Cleanup
    useEffect(() => {
        return () => {
            earthGeometry.dispose();
            atmosphereGeometry.dispose();
            earthMaterial.dispose();
            atmosphereMaterial.dispose();
            gridLines.forEach((line) => line.dispose());
        };
    }, [earthGeometry, atmosphereGeometry, earthMaterial, atmosphereMaterial, gridLines]);

    return (
        <group ref={earthRef}>
            {/* Globo principale */}
            <mesh ref={globeRef} geometry={earthGeometry} material={earthMaterial} />

            {/* Griglia del globo */}
            {gridLines.map((geometry, index) => (
                <lineLoop key={`grid-${index}`} geometry={geometry}>
                    <lineBasicMaterial color="#60A5FA" transparent opacity={0.25} />
                </lineLoop>
            ))}

            {/* Atmosfera glow */}
            <mesh geometry={atmosphereGeometry} material={atmosphereMaterial} />

            {/* Atmosfera esterna */}
            <mesh>
                <sphereGeometry args={[radius * 1.15, 32, 32]} />
                <meshBasicMaterial
                    color="#1e90ff"
                    transparent
                    opacity={0.08}
                    side={THREE.BackSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Pin dei viaggi */}
            {trips.map((trip) => (
                <TripPin
                    key={trip.id}
                    trip={trip}
                    onClick={() => onPinClick(trip)}
                    radius={radius}
                />
            ))}
        </group>
    );
}

function GlobeScene(props: EarthGlobeProps) {
    return (
        <>
            <ambientLight intensity={0.6} />
            <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
            <pointLight position={[-10, -10, -5]} intensity={0.4} color="#4da6ff" />

            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={0.5} />

            <Earth {...props} />

            <OrbitControls
                enablePan={false}
                minDistance={DEFAULT_GLOBE_CONFIG.zoomMin}
                maxDistance={DEFAULT_GLOBE_CONFIG.zoomMax}
                enableDamping
                dampingFactor={0.05}
                rotateSpeed={0.5}
                zoomSpeed={0.8}
            />
        </>
    );
}

export default function EarthGlobe(props: EarthGlobeProps) {
    return (
        <View style={styles.container}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
                <GlobeScene {...props} />
            </Canvas>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
    }
});
