import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import EarthGlobe from './src/components/EarthGlobe';
import TripForm from './src/components/TripForm';
import MemoryViewer from './src/components/MemoryViewer';
import TripSidebar from './src/components/TripSidebar';
import ErrorBoundary from './src/components/ErrorBoundary'; // Imported ErrorBoundary
import StorageService from './src/services/StorageService';
import { Trip } from './src/types';

// Loading Fallback Component
const LoadingFallback: React.FC = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#60A5FA" />
    <Text style={styles.loadingText}>Caricamento globo...</Text>
  </View>
);

// Main App Component
const App: React.FC = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;
  const isSmallPhone = SCREEN_WIDTH < 400;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [focusLocation, setFocusLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true); // Rotation state

  // Lock to landscape orientation
  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE
      );
    };
    lockOrientation();
  }, []);

  // Load trips from storage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTrips = await StorageService.loadTrips();
        setTrips(savedTrips);
      } catch (error) {
        console.error('Error loading trips:', error);
        Alert.alert('Errore', 'Impossibile caricare i viaggi salvati.');
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Save trips whenever they change
  useEffect(() => {
    if (!isLoading) {
      StorageService.saveTrips(trips).catch((error) => {
        console.error('Error saving trips:', error);
      });
    }
  }, [trips, isLoading]);

  // Generate unique ID
  const generateId = useCallback((): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }, []);

  // Handle adding new trip
  const handleAddTrip = useCallback(
    (tripData: Omit<Trip, 'id' | 'createdAt'>) => {
      const newTrip: Trip = {
        ...tripData,
        id: generateId(),
        createdAt: Date.now(),
      };

      setTrips((prev) => [...prev, newTrip]);
      setShowForm(false);

      // Focus on new location
      setFocusLocation({
        lat: tripData.latitude,
        lon: tripData.longitude,
      });

      // Clear focus after animation
      setTimeout(() => setFocusLocation(null), 3000);
    },
    [generateId]
  );

  // Handle pin press
  const handlePinPress = useCallback((trip: Trip) => {
    setSelectedTrip(trip);
  }, []);

  // Close memory viewer
  const handleCloseMemory = useCallback(() => {
    setSelectedTrip(null);
  }, []);

  // Handle delete trip
  const handleDeleteTrip = useCallback(
    async (tripId: string) => {
      try {
        const updatedTrips = await StorageService.deleteTrip(tripId, trips);
        setTrips(updatedTrips);
        setSelectedTrip(null);
      } catch (error) {
        console.error('Error deleting trip:', error);
        Alert.alert('Errore', 'Impossibile eliminare il viaggio.');
      }
    },
    [trips]
  );

  // Responsive styles
  const dynamicStyles = {
    logo: {
      fontSize: isSmallPhone ? 24 : isTablet ? 36 : 28,
    },
    subtitle: {
      fontSize: isSmallPhone ? 10 : 12,
      letterSpacing: isSmallPhone ? 2 : 3,
    },
    addButton: {
      paddingVertical: isSmallPhone ? 10 : 14,
      paddingHorizontal: isSmallPhone ? 16 : 24,
    },
    addButtonText: {
      fontSize: isSmallPhone ? 14 : 16,
    },
    counterPadding: {
      paddingHorizontal: isSmallPhone ? 12 : 16,
      paddingVertical: isSmallPhone ? 8 : 10,
    },
  };

  // Show loading screen while data loads
  if (isLoading) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <LoadingFallback />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.container}>
          {/* 3D Globe */}
          <View style={styles.globeContainer}>
            <Suspense fallback={<LoadingFallback />}>
              <EarthGlobe
                trips={trips}
                onPinClick={handlePinPress}
                targetCoordinates={focusLocation ? { latitude: focusLocation.lat, longitude: focusLocation.lon } : null}
                autoRotate={autoRotate}
              />
            </Suspense>
          </View>

          {/* Header Overlay */}
          <SafeAreaView style={styles.headerContainer} edges={['top', 'left']}>
            <View style={styles.header}>
              {/* Hamburger menu button */}
              <TouchableOpacity
                style={styles.hamburgerButton}
                onPress={() => setSidebarOpen(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="menu" size={28} color="#60A5FA" />
              </TouchableOpacity>
              <View>
                <Text style={[styles.logo, dynamicStyles.logo]}>TRAVELSPHERE</Text>
                <Text style={[styles.subtitle, dynamicStyles.subtitle]}>
                  Diario di Viaggio Immersivo
                </Text>
              </View>
            </View>
          </SafeAreaView>

          {/* Trip Counter */}
          <View style={styles.counterContainer}>
            <BlurView intensity={40} style={[styles.tripCounter, dynamicStyles.counterPadding]} tint="dark">
              <Ionicons name="pin" size={isSmallPhone ? 14 : 16} color="#60A5FA" />
              <Text style={[styles.tripCounterText, isSmallPhone && { fontSize: 12 }]}>
                {trips.length} {trips.length === 1 ? 'viaggio' : 'viaggi'}
              </Text>
            </BlurView>
          </View>

          {/* Rotation Toggle Button */}
          <View style={styles.rotationControlContainer}>
            <BlurView intensity={30} style={styles.rotationBlur} tint="dark">
              <TouchableOpacity
                style={styles.rotationButton}
                onPress={() => setAutoRotate(!autoRotate)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={autoRotate ? "pause" : "play"}
                  size={24}
                  color="rgba(255,255,255,0.8)"
                />
              </TouchableOpacity>
            </BlurView>
          </View>

          {/* Add Trip Button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity
              style={[styles.addButton, dynamicStyles.addButton]}
              onPress={() => setShowForm(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={isSmallPhone ? 24 : 28} color="#fff" />
              <Text style={[styles.addButtonText, dynamicStyles.addButtonText]}>
                {isSmallPhone ? 'Aggiungi' : 'Aggiungi Viaggio'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Instructions Hint */}
          {!isSmallPhone && (
            <View style={styles.hintContainer}>
              <BlurView intensity={30} style={styles.hint} tint="dark">
                <Ionicons name="hand-left-outline" size={16} color="rgba(255,255,255,0.5)" />
                <Text style={styles.hintText}>
                  Ruota e zooma il globo • Tocca i pin per vedere le memorie
                </Text>
              </BlurView>
            </View>
          )}

          {/* Trip Form Modal */}
          <TripForm
            visible={showForm}
            onClose={() => setShowForm(false)}
            onSave={handleAddTrip}
          />

          {/* Memory Viewer Modal */}
          <MemoryViewer
            trip={selectedTrip}
            visible={!!selectedTrip}
            onClose={handleCloseMemory}
            onDelete={handleDeleteTrip}
          />

          {/* Trip Sidebar */}
          <TripSidebar
            trips={trips}
            visible={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onTripSelect={(trip) => {
              setFocusLocation({
                lat: trip.latitude,
                lon: trip.longitude,
              });
              setTimeout(() => setFocusLocation(null), 3000);
            }}
            onTripView={(trip) => {
              setSelectedTrip(trip);
              setSidebarOpen(false);
            }}
            onDelete={handleDeleteTrip} // Passed onDelete
          />
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050510',
  },
  globeContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050510',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: 16,
    fontSize: 16,
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hamburgerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
  },
  logo: {
    fontWeight: '900',
    letterSpacing: -1,
    color: '#60A5FA',
    textShadowColor: 'rgba(96, 165, 250, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  subtitle: {
    fontWeight: '300',
    color: 'rgba(255, 255, 255, 0.6)',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  counterContainer: {
    position: 'absolute',
    top: 28,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tripCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  tripCounterText: {
    color: '#D1D5DB',
    fontSize: 14,
    fontWeight: '500',
  },
  addButtonContainer: {
    position: 'absolute',
    bottom: 28,
    right: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 50,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  rotationControlContainer: {
    position: 'absolute',
    bottom: 28,
    right: 200, // Positioned to the left of the Add Button
  },
  rotationBlur: {
    borderRadius: 50,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  rotationButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintContainer: {
    position: 'absolute',
    bottom: 28,
    left: 20,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  hintText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
  },
});

export default App;
