import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import EarthGlobe from './src/components/EarthGlobe';
import TripForm from './src/components/TripForm';
import MemoryViewer from './src/components/MemoryViewer';
import TripSidebar from './src/components/TripSidebar';
import ShareModal from './src/components/ShareModal';
import SettingsScreen from './src/components/SettingsScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import StorageService from './src/services/StorageService';
import { Trip, HomeLocation, Itinerary } from './src/types';

const App: React.FC = () => {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;

  // Core state
  const [trips, setTrips] = useState<Trip[]>([]);
  const [homeLocation, setHomeLocation] = useState<HomeLocation | null>(null);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [shareTrip, setShareTrip] = useState<Trip | null>(null);

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
    lockOrientation();
  }, []);

  // Load all data on startup
  useEffect(() => {
    const loadData = async () => {
      try {
        const [savedTrips, savedHome, savedItineraries] = await Promise.all([
          StorageService.loadTrips(),
          StorageService.loadHomeLocation(),
          StorageService.loadItineraries(),
        ]);
        setTrips(savedTrips);
        setHomeLocation(savedHome);
        setItineraries(savedItineraries);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // Auto-save trips when they change
  useEffect(() => {
    if (!isLoading && trips.length >= 0) {
      StorageService.saveTrips(trips).catch(err =>
        console.error('Error saving trips:', err)
      );
    }
  }, [trips, isLoading]);

  const generateId = useCallback((): string => {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }, []);

  const handleAddTrip = useCallback((tripData: any, itineraryInfo?: { itineraryId?: string; newItineraryName?: string }) => {
    const newTrip: Trip = { ...tripData, id: generateId(), createdAt: Date.now() };

    // Handle itinerary assignment
    if (itineraryInfo) {
      if (itineraryInfo.itineraryId) {
        // Add to existing itinerary
        newTrip.itineraryId = itineraryInfo.itineraryId;
        setItineraries(prev => {
          const updated = prev.map(itin => {
            if (itin.id === itineraryInfo.itineraryId) {
              newTrip.itineraryOrder = itin.tripIds.length;
              return { ...itin, tripIds: [...itin.tripIds, newTrip.id] };
            }
            return itin;
          });
          StorageService.saveItineraries(updated);
          return updated;
        });
      } else if (itineraryInfo.newItineraryName) {
        // Create new itinerary
        const newItinerary: Itinerary = {
          id: generateId(),
          name: itineraryInfo.newItineraryName,
          tripIds: [newTrip.id],
          createdAt: Date.now(),
        };
        newTrip.itineraryId = newItinerary.id;
        newTrip.itineraryOrder = 0;
        setItineraries(prev => {
          const updated = [...prev, newItinerary];
          StorageService.saveItineraries(updated);
          return updated;
        });
      }
    }

    setTrips(prev => [...prev, newTrip]);
    setShowForm(false);
  }, [generateId]);

  const handleDeleteTrip = useCallback(async (tripId: string) => {
    const updatedTrips = await StorageService.deleteTrip(tripId, trips);
    setTrips(updatedTrips);
    setSelectedTrip(null);

    // Remove trip from itineraries
    setItineraries(prev => {
      const updated = prev
        .map(itin => ({
          ...itin,
          tripIds: itin.tripIds.filter(id => id !== tripId),
        }))
        .filter(itin => itin.tripIds.length > 0);
      StorageService.saveItineraries(updated);
      return updated;
    });
  }, [trips]);

  const handleSetHome = useCallback(async (home: HomeLocation) => {
    setHomeLocation(home);
    await StorageService.saveHomeLocation(home);
  }, []);

  const handleClearData = useCallback(async () => {
    try {
      await StorageService.clearAll();
      setTrips([]);
      setHomeLocation(null);
      setItineraries([]);
      setShowSettings(false);
      Alert.alert('Fatto', 'Tutti i dati sono stati cancellati.');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile cancellare i dati.');
    }
  }, []);

  const handleShare = useCallback((trip: Trip) => {
    setShareTrip(trip);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.container}>
          {/* 3D Globe */}
          <EarthGlobe
            trips={trips}
            onPinClick={(trip) => setSelectedTrip(trip)}
            targetCoordinates={selectedTrip ? { latitude: selectedTrip.latitude, longitude: selectedTrip.longitude } : null}
            homeLocation={homeLocation}
            itineraries={itineraries}
          />

          {/* Header */}
          <SafeAreaView style={styles.headerContainer} edges={['top', 'left']}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => setSidebarOpen(true)}>
                <Ionicons name="menu" size={26} color="#60A5FA" />
              </TouchableOpacity>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>TRAVELSPHERE</Text>
                <Text style={styles.subtitle}>Diario di Viaggio Immersivo</Text>
              </View>
            </View>
          </SafeAreaView>

          {/* Settings button (top-right) */}
          <SafeAreaView style={styles.settingsContainer} edges={['top', 'right']}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => setShowSettings(true)}>
              <Ionicons name="settings-outline" size={24} color="#60A5FA" />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Trip counter badge */}
          {trips.length > 0 && (
            <View style={styles.tripCountBadge}>
              <Ionicons name="airplane" size={14} color="#60A5FA" />
              <Text style={styles.tripCountText}>{trips.length}</Text>
            </View>
          )}

          {/* Add Trip button */}
          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={styles.addButtonText}>Aggiungi Viaggio</Text>
            </TouchableOpacity>
          </View>

          {/* Modals */}
          <TripForm
            visible={showForm}
            onClose={() => setShowForm(false)}
            onSave={handleAddTrip}
            itineraries={itineraries}
          />

          <MemoryViewer
            trip={selectedTrip}
            visible={!!selectedTrip}
            onClose={() => setSelectedTrip(null)}
            onDelete={handleDeleteTrip}
            onShare={handleShare}
          />

          <TripSidebar
            trips={trips}
            visible={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onTripSelect={(trip) => { setSelectedTrip(trip); setSidebarOpen(false); }}
            onTripView={(trip) => { setSelectedTrip(trip); setSidebarOpen(false); }}
            onDelete={handleDeleteTrip}
          />

          <ShareModal
            trip={shareTrip}
            visible={!!shareTrip}
            onClose={() => setShareTrip(null)}
          />

          <SettingsScreen
            visible={showSettings}
            onClose={() => setShowSettings(false)}
            homeLocation={homeLocation}
            onSetHome={handleSetHome}
            onClearData={handleClearData}
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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050510',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    color: '#60A5FA',
    fontSize: 16,
    fontWeight: '500',
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
  headerBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.15)',
  },
  logoContainer: {
    gap: 2,
  },
  logo: {
    fontWeight: '900',
    fontSize: 26,
    color: '#60A5FA',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  settingsContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 20,
  },
  tripCountBadge: {
    position: 'absolute',
    top: 20,
    right: 70,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(96, 165, 250, 0.1)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.15)',
  },
  tripCountText: {
    color: '#60A5FA',
    fontSize: 14,
    fontWeight: '700',
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
    paddingVertical: 14,
    paddingHorizontal: 24,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default App;
