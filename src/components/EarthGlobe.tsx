/**
 * TravelSphere - EarthGlobe Component
 * Componente principale per il globo 3D interattivo
 * Con zoom adattivo e texture ad alta risoluzione
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { Stars, OrbitControls, useTexture } from '@react-three/drei';
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
    // Normalizza la distanza tra 0 e 1 (invertito: più vicino = 1, più lontano = 0)
    const normalized = 1 - (cameraDistance - zoomMin) / (zoomMax - zoomMin);
    const clamped = Math.max(0, Math.min(1, normalized));
    // Interpola tra min e max segmenti
    return Math.round(segmentsMin + clamped * (segmentsMax - segmentsMin));
}

// Componente interno per la Terra con geometria adattiva
function Earth({
    trips,
    onPinClick,
    targetCoordinates,
    autoRotate = true,
}: EarthGlobeProps) {
    const earthRef = useRef<THREE.Group>(null);
    const globeRef = useRef<THREE.Mesh>(null);
    const cloudsRef = useRef<THREE.Mesh>(null);
    const targetRotation = useRef<[number, number, number] | null>(null);
    const isAnimating = useRef(false);
    const animationProgress = useRef(0);
    const startRotation = useRef<[number, number, number]>([0, 0, 0]);

    // Stato per il livello di dettaglio adattivo
    const [currentSegments, setCurrentSegments] = useState(DEFAULT_GLOBE_CONFIG.segments);
    const lastSegmentUpdate = useRef(0);

    // Accesso alla camera Three.js
    const { camera } = useThree();

    // Configurazione del globo
    const { radius, rotationSpeed } = DEFAULT_GLOBE_CONFIG;

    // Caricamento texture ad alta risoluzione 
    // Blue Marble 4K dalla libreria three-globe + texture originali three.js per normali/specular
    const [colorMap, normalMap, specularMap, cloudsMap] = useTexture([
        // Texture colore 4K Blue Marble
        'https://unpkg.com/three-globe@2.31.1/example/img/earth-blue-marble.jpg',
        // Normali originali three.js
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg',
        // Specular originali three.js  
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
        // Nuvole originali three.js
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png',
    ]);

    // Configura le texture per alta qualità al caricamento
    useEffect(() => {
        const textures = [colorMap, normalMap, specularMap, cloudsMap];
        textures.forEach((texture) => {
            if (texture) {
                // Anisotropic filtering per texture nitide agli angoli
                texture.anisotropy = 16;
                // Filtering di alta qualità
                texture.minFilter = THREE.LinearMipmapLinearFilter;
                texture.magFilter = THREE.LinearFilter;
                // Genera mipmaps per zoom fluido
                texture.generateMipmaps = true;
                texture.needsUpdate = true;
            }
        });
    }, [colorMap, normalMap, specularMap, cloudsMap]);

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

    // Animazione frame-by-frame con aggiornamento LOD
    useFrame((state, delta) => {
        if (!earthRef.current) return;

        // Animazione nuvole (sempre attiva)
        if (cloudsRef.current) {
            cloudsRef.current.rotation.y += delta * 0.05;
        }

        // Calcola la distanza della camera e aggiorna i segmenti
        const cameraDistance = camera.position.length();
        const now = state.clock.elapsedTime;

        // Aggiorna i segmenti solo ogni 0.5 secondi per evitare lag
        if (now - lastSegmentUpdate.current > 0.5) {
            const newSegments = calculateSegments(cameraDistance);
            if (newSegments !== currentSegments) {
                setCurrentSegments(newSegments);
            }
            lastSegmentUpdate.current = now;
        }

        // Animazione verso le coordinate target
        if (isAnimating.current && targetRotation.current) {
            animationProgress.current += delta * 0.5;

            const t = Math.min(animationProgress.current, 1);
            const smoothT = t * t * (3 - 2 * t);

            earthRef.current.rotation.x = lerp(
                startRotation.current[0],
                targetRotation.current[0],
                smoothT
            );
            earthRef.current.rotation.y = lerp(
                startRotation.current[1],
                targetRotation.current[1],
                smoothT
            );

            if (t >= 1) {
                isAnimating.current = false;
                targetRotation.current = null;
            }
        }
        // Auto-rotazione quando non sta animando
        else if (autoRotate && !isAnimating.current) {
            earthRef.current.rotation.y += rotationSpeed;
        }
    });

    // Materiale Earth con texture ad alta qualità
    const earthMaterial = useMemo(() => {
        return new THREE.MeshPhongMaterial({
            map: colorMap,
            normalMap: normalMap,
            specularMap: specularMap,
            specular: new THREE.Color(0x333333),
            shininess: 15,
        });
    }, [colorMap, normalMap, specularMap]);

    // Materiale per le nuvole
    const cloudsMaterial = useMemo(() => {
        return new THREE.MeshPhongMaterial({
            map: cloudsMap,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
    }, [cloudsMap]);

    // Materiale per l'atmosfera
    const atmosphereMaterial = useMemo(() => {
        return new THREE.MeshBasicMaterial({
            color: new THREE.Color('#4a9eff'),
            transparent: true,
            opacity: 0.1,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
        });
    }, []);

    // Geometria sfera con segmenti adattivi
    const earthGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius, currentSegments, currentSegments);
    }, [radius, currentSegments]);

    const cloudsGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius * 1.015, currentSegments, currentSegments);
    }, [radius, currentSegments]);

    const atmosphereGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius * 1.05, Math.max(32, currentSegments / 2), Math.max(32, currentSegments / 2));
    }, [radius, currentSegments]);

    // Crea le linee di griglia
    const gridLines = useMemo(() => {
        const lines: THREE.BufferGeometry[] = [];

        // Paralleli (latitudine)
        for (let lat = -60; lat <= 60; lat += 30) {
            const points: THREE.Vector3[] = [];
            for (let lon = 0; lon <= 360; lon += 5) {
                const pos = latLonToVector3({ latitude: lat, longitude: lon }, radius + 0.015);
                points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            lines.push(geometry);
        }

        // Meridiani (longitudine)
        for (let lon = 0; lon < 360; lon += 30) {
            const points: THREE.Vector3[] = [];
            for (let lat = -90; lat <= 90; lat += 5) {
                const pos = latLonToVector3({ latitude: lat, longitude: lon }, radius + 0.015);
                points.push(new THREE.Vector3(pos.x, pos.y, pos.z));
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            lines.push(geometry);
        }

        return lines;
    }, [radius]);

    return (
        <group ref={earthRef}>
            {/* Globo principale con geometria adattiva */}
            <mesh ref={globeRef} geometry={earthGeometry} material={earthMaterial} />

            {/* Livello Nuvole */}
            <mesh ref={cloudsRef} geometry={cloudsGeometry} material={cloudsMaterial} />

            {/* Griglia del globo (Tech Layer) */}
            {gridLines.map((geometry, index) => (
                <lineLoop key={`grid-${index}`} geometry={geometry}>
                    <lineBasicMaterial
                        color="#60A5FA"
                        transparent
                        opacity={0.15}
                    />
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
                    opacity={0.05}
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
            {/* Illuminazione */}
            <ambientLight intensity={0.5} />
            <directionalLight
                position={[5, 3, 5]}
                intensity={1.5}
                color="#ffffff"
            />
            <pointLight
                position={[-10, -10, -5]}
                intensity={0.5}
                color="#4da6ff"
            />

            {/* Stelle di sfondo */}
            <Stars
                radius={100}
                depth={50}
                count={5000}
                factor={4}
                saturation={0}
                fade
                speed={0.5}
            />

            {/* Terra */}
            <Earth {...props} />

            {/* Controlli orbitali con smooth zoom */}
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

// Componente Scene completo
export default function EarthGlobe(props: EarthGlobeProps) {
    return (
        <View style={styles.container}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                gl={{
                    antialias: true,
                    // Abilita alta qualità rendering
                    powerPreference: 'high-performance',
                }}
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
