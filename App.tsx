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
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import EarthGlobe from './src/components/EarthGlobe';
import TripForm from './src/components/TripForm';
import MemoryViewer from './src/components/MemoryViewer';
import TripSidebar from './src/components/TripSidebar';
import ErrorBoundary from './src/components/ErrorBoundary';
import StorageService from './src/services/StorageService';
import { Trip } from './src/types';
import logger from './src/utils/logger';

// Type for new trip data (without id and createdAt)
type NewTripData = Omit<Trip, 'id' | 'createdAt'>;

const App: React.FC = () => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const isTablet = SCREEN_WIDTH >= 768;
  const isSmallPhone = SCREEN_WIDTH < 400;

  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const lockOrientation = async () => {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    };
    lockOrientation();
  }, []);

  useEffect(() => {
    const loadData = async () => {
      try {
        const savedTrips = await StorageService.loadTrips();
        setTrips(savedTrips);
      } catch (error) {
        logger.error('Error loading trips:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const generateId = useCallback((): string => {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }, []);

  const handleAddTrip = useCallback(async (tripData: NewTripData) => {
    const newTrip: Trip = { ...tripData, id: generateId(), createdAt: Date.now() };
    const updatedTrips = [...trips, newTrip];
    setTrips(updatedTrips);
    setShowForm(false);

    // Persist to storage
    try {
      await StorageService.saveTrips(updatedTrips);
      logger.info('Trip saved successfully:', newTrip.title);
    } catch (error) {
      logger.error('Error saving trip:', error);
      Alert.alert('Errore', 'Impossibile salvare il viaggio. Riprova.');
    }
  }, [generateId, trips]);

  const handleDeleteTrip = useCallback(async (tripId: string) => {
    const updatedTrips = await StorageService.deleteTrip(tripId, trips);
    setTrips(updatedTrips);
    setSelectedTrip(null);
  }, [trips]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.container}>
          <EarthGlobe
            trips={trips}
            onPinClick={(trip) => setSelectedTrip(trip)}
            targetCoordinates={selectedTrip ? { latitude: selectedTrip.latitude, longitude: selectedTrip.longitude } : null}
          />

          <SafeAreaView style={styles.headerContainer} edges={['top', 'left']}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidebarOpen(true)}>
                <Ionicons name="menu" size={28} color="#60A5FA" />
              </TouchableOpacity>
              <View>
                <Text style={styles.logo}>TRAVELSPHERE</Text>
              </View>
            </View>
          </SafeAreaView>

          <View style={styles.addButtonContainer}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={styles.addButtonText}>Aggiungi Viaggio</Text>
            </TouchableOpacity>
          </View>

          <TripForm visible={showForm} onClose={() => setShowForm(false)} onSave={handleAddTrip} />
          <MemoryViewer trip={selectedTrip} visible={!!selectedTrip} onClose={() => setSelectedTrip(null)} onDelete={handleDeleteTrip} />
          <TripSidebar trips={trips} visible={sidebarOpen} onClose={() => setSidebarOpen(false)}
            onTripSelect={(trip) => { setSelectedTrip(trip); setSidebarOpen(false); }}
            onTripView={(trip) => { setSelectedTrip(trip); setSidebarOpen(false); }}
            onDelete={handleDeleteTrip} />
        </View>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  globePlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
  placeholderText: { color: '#60A5FA', fontSize: 24, fontWeight: 'bold' },
  placeholderSubtext: { color: '#9CA3AF', fontSize: 16 },
  headerContainer: { position: 'absolute', top: 0, left: 0, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(96, 165, 250, 0.1)' },
  logo: { fontWeight: '900', fontSize: 28, color: '#60A5FA' },
  addButtonContainer: { position: 'absolute', bottom: 28, right: 20 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24 },
  addButtonText: { color: '#fff', fontWeight: '600' },
});

export default App;
