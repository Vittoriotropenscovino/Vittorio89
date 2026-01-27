import React, { useState, useEffect, useCallback, ErrorInfo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import TripForm from './src/components/TripForm';
import MemoryViewer from './src/components/MemoryViewer';
import TripSidebar from './src/components/TripSidebar';
import StorageService from './src/services/StorageService';
import { Trip } from './src/types';
import logger from './src/utils/logger';

// Lazy load EarthGlobe to catch errors
let EarthGlobe: React.ComponentType<any> | null = null;
let globeLoadError: string | null = null;

try {
  EarthGlobe = require('./src/components/EarthGlobe').default;
} catch (error: any) {
  globeLoadError = error?.message || 'Failed to load 3D Globe';
  logger.error('Failed to load EarthGlobe:', error);
}

// Type for new trip data (without id and createdAt)
type NewTripData = Omit<Trip, 'id' | 'createdAt'>;

// Simple Error Boundary component
class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    logger.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <Text style={errorStyles.title}>⚠️ App Error</Text>
          <ScrollView style={errorStyles.scrollView}>
            <Text style={errorStyles.errorText}>
              {this.state.error?.toString()}
            </Text>
            <Text style={errorStyles.stackText}>
              {this.state.error?.stack}
            </Text>
            {this.state.errorInfo && (
              <Text style={errorStyles.stackText}>
                Component Stack:{'\n'}
                {this.state.errorInfo.componentStack}
              </Text>
            )}
          </ScrollView>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            <Text style={errorStyles.buttonText}>Riprova</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e', padding: 20, justifyContent: 'center' },
  title: { fontSize: 24, color: '#ff6b6b', fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  scrollView: { maxHeight: 400, backgroundColor: '#0d0d1a', borderRadius: 10, padding: 15, marginBottom: 20 },
  errorText: { color: '#ff6b6b', fontSize: 14, marginBottom: 10 },
  stackText: { color: '#888', fontSize: 11, fontFamily: 'monospace' },
  button: { backgroundColor: '#3B82F6', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

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

  // Render fallback if globe failed to load
  const renderGlobe = () => {
    if (globeLoadError || !EarthGlobe) {
      return (
        <View style={styles.globeFallback}>
          <Ionicons name="globe-outline" size={100} color="#3B82F6" />
          <Text style={styles.fallbackTitle}>TravelSphere</Text>
          <Text style={styles.fallbackText}>
            {globeLoadError || '3D Globe non disponibile'}
          </Text>
          <Text style={styles.fallbackHint}>
            Puoi comunque aggiungere e visualizzare i tuoi viaggi
          </Text>
        </View>
      );
    }

    return (
      <EarthGlobe
        trips={trips}
        onPinClick={(trip: Trip) => setSelectedTrip(trip)}
        targetCoordinates={selectedTrip ? { latitude: selectedTrip.latitude, longitude: selectedTrip.longitude } : null}
      />
    );
  };

  return (
    <AppErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <View style={styles.container}>
          {renderGlobe()}

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
    </AppErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  globeFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0a1a' },
  fallbackTitle: { fontSize: 32, fontWeight: 'bold', color: '#60A5FA', marginTop: 20 },
  fallbackText: { fontSize: 14, color: '#ff6b6b', marginTop: 10, textAlign: 'center', paddingHorizontal: 40 },
  fallbackHint: { fontSize: 12, color: '#666', marginTop: 10 },
  headerContainer: { position: 'absolute', top: 0, left: 0, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: { padding: 8, borderRadius: 8, backgroundColor: 'rgba(96, 165, 250, 0.1)' },
  logo: { fontWeight: '900', fontSize: 28, color: '#60A5FA' },
  addButtonContainer: { position: 'absolute', bottom: 28, right: 20 },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F6', borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24 },
  addButtonText: { color: '#fff', fontWeight: '600' },
});

export default App;
