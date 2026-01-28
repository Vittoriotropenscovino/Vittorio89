/**
 * TravelSphere - EarthGlobe Component
 * Globo 3D realistico con texture locali (compatibile Android)
 */

import React, { useRef, useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useFrame, useThree, Canvas } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Asset } from 'expo-asset';
import { Trip, Coordinates, DEFAULT_GLOBE_CONFIG } from '../types';
import { latLonToVector3, getGlobeRotationForCoords, lerp } from '../utils/coordinates';
import TripPin from './TripPin';

// Import texture assets
const earthTextureAsset = require('../../assets/textures/earth-blue-marble.jpg');
const earthNormalAsset = require('../../assets/textures/earth_normal.jpg');
const earthSpecularAsset = require('../../assets/textures/earth_specular.jpg');
const cloudsTextureAsset = require('../../assets/textures/earth_clouds.png');

interface EarthGlobeProps {
    trips: Trip[];
    onPinClick: (trip: Trip) => void;
    targetCoordinates?: Coordinates | null;
    autoRotate?: boolean;
}

interface TextureURIs {
    earth: string | null;
    normal: string | null;
    specular: string | null;
    clouds: string | null;
}

// Calcola il numero di segmenti in base alla distanza della camera
function calculateSegments(cameraDistance: number): number {
    const { zoomMin, zoomMax, segmentsMin, segmentsMax } = DEFAULT_GLOBE_CONFIG;
    const normalized = 1 - (cameraDistance - zoomMin) / (zoomMax - zoomMin);
    const clamped = Math.max(0, Math.min(1, normalized));
    return Math.round(segmentsMin + clamped * (segmentsMax - segmentsMin));
}

// Hook per caricare le texture
function useEarthTextures(): { textures: { [key: string]: THREE.Texture | null }, loading: boolean } {
    const [textures, setTextures] = useState<{ [key: string]: THREE.Texture | null }>({
        earth: null,
        normal: null,
        specular: null,
        clouds: null,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        async function loadTextures() {
            try {
                const textureLoader = new THREE.TextureLoader();

                // Load assets with expo-asset
                const [earthAsset, normalAsset, specularAsset, cloudsAsset] = await Promise.all([
                    Asset.fromModule(earthTextureAsset).downloadAsync(),
                    Asset.fromModule(earthNormalAsset).downloadAsync(),
                    Asset.fromModule(earthSpecularAsset).downloadAsync(),
                    Asset.fromModule(cloudsTextureAsset).downloadAsync(),
                ]);

                if (!mounted) return;

                const loadedTextures: { [key: string]: THREE.Texture | null } = {
                    earth: null,
                    normal: null,
                    specular: null,
                    clouds: null,
                };

                // Load each texture from local URI
                const loadTexture = (uri: string | null): Promise<THREE.Texture | null> => {
                    return new Promise((resolve) => {
                        if (!uri) {
                            resolve(null);
                            return;
                        }
                        textureLoader.load(
                            uri,
                            (texture) => resolve(texture),
                            undefined,
                            () => resolve(null)
                        );
                    });
                };

                const [earthTex, normalTex, specularTex, cloudsTex] = await Promise.all([
                    loadTexture(earthAsset.localUri || earthAsset.uri),
                    loadTexture(normalAsset.localUri || normalAsset.uri),
                    loadTexture(specularAsset.localUri || specularAsset.uri),
                    loadTexture(cloudsAsset.localUri || cloudsAsset.uri),
                ]);

                if (!mounted) return;

                loadedTextures.earth = earthTex;
                loadedTextures.normal = normalTex;
                loadedTextures.specular = specularTex;
                loadedTextures.clouds = cloudsTex;

                setTextures(loadedTextures);
                setLoading(false);
            } catch (error) {
                console.warn('Failed to load textures:', error);
                if (mounted) setLoading(false);
            }
        }

        loadTextures();

        return () => {
            mounted = false;
        };
    }, []);

    return { textures, loading };
}

// Componente interno per la Terra con texture
function Earth({
    trips,
    onPinClick,
    targetCoordinates,
    autoRotate = true,
    textures,
}: EarthGlobeProps & { textures: { [key: string]: THREE.Texture | null } }) {
    const earthRef = useRef<THREE.Group>(null);
    const cloudsRef = useRef<THREE.Mesh>(null);
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

        // Rotate clouds slightly faster
        if (cloudsRef.current) {
            cloudsRef.current.rotation.y += rotationSpeed * 1.1;
        }
    });

    // Materiale Earth con texture
    const earthMaterial = useMemo(() => {
        if (textures.earth) {
            return new THREE.MeshPhongMaterial({
                map: textures.earth,
                normalMap: textures.normal || undefined,
                specularMap: textures.specular || undefined,
                specular: new THREE.Color('#333333'),
                shininess: 25,
            });
        }
        // Fallback se texture non disponibili
        return new THREE.MeshPhongMaterial({
            color: new THREE.Color('#1a4a7a'),
            emissive: new THREE.Color('#0a2040'),
            emissiveIntensity: 0.3,
            specular: new THREE.Color('#4a9eff'),
            shininess: 30,
        });
    }, [textures]);

    // Materiale per le nuvole
    const cloudsMaterial = useMemo(() => {
        if (textures.clouds) {
            return new THREE.MeshPhongMaterial({
                map: textures.clouds,
                transparent: true,
                opacity: 0.4,
                depthWrite: false,
            });
        }
        return null;
    }, [textures]);

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

    const cloudsGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius * 1.01, 48, 48);
    }, [radius]);

    const atmosphereGeometry = useMemo(() => {
        return new THREE.SphereGeometry(radius * 1.08, 32, 32);
    }, [radius]);

    // Cleanup
    useEffect(() => {
        return () => {
            earthGeometry.dispose();
            cloudsGeometry.dispose();
            atmosphereGeometry.dispose();
            earthMaterial.dispose();
            cloudsMaterial?.dispose();
            atmosphereMaterial.dispose();
        };
    }, [earthGeometry, cloudsGeometry, atmosphereGeometry, earthMaterial, cloudsMaterial, atmosphereMaterial]);

    return (
        <group ref={earthRef}>
            {/* Globo principale con texture */}
            <mesh ref={globeRef} geometry={earthGeometry} material={earthMaterial} />

            {/* Strato nuvole */}
            {cloudsMaterial && (
                <mesh ref={cloudsRef} geometry={cloudsGeometry} material={cloudsMaterial} />
            )}

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

function GlobeScene(props: EarthGlobeProps & { textures: { [key: string]: THREE.Texture | null } }) {
    return (
        <>
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 3, 5]} intensity={1.5} color="#ffffff" />
            <pointLight position={[-10, -10, -5]} intensity={0.3} color="#4da6ff" />

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
    const { textures, loading } = useEarthTextures();

    return (
        <View style={styles.container}>
            <Canvas
                camera={{ position: [0, 0, 8], fov: 45 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
            >
                <GlobeScene {...props} textures={textures} />
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
