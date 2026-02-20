import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Animated, Easing, BackHandler, Alert, Linking,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './src/contexts/AppContext';
import EarthGlobe from './src/components/EarthGlobe';
import TripForm from './src/components/TripForm';
import MemoryViewer from './src/components/MemoryViewer';
import TripSidebar from './src/components/TripSidebar';
import ErrorBoundary from './src/components/ErrorBoundary';
import OnboardingScreen from './src/components/OnboardingScreen';
import GDPRConsent from './src/components/GDPRConsent';
import SettingsScreen from './src/components/SettingsScreen';
import PrivacyPolicy from './src/components/PrivacyPolicy';
import TermsOfService from './src/components/TermsOfService';
import StatsScreen from './src/components/StatsScreen';
import CalendarView from './src/components/CalendarView';
import SaveConfirmation from './src/components/SaveConfirmation';
import OfflineBanner from './src/components/OfflineBanner';
import ItineraryManager from './src/components/ItineraryManager';
import StorageService from './src/services/StorageService';
import { Trip, Itinerary } from './src/types';

const AppContent: React.FC = () => {
  const { t, settings, updateSettings, isSettingsLoaded } = useApp();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [authenticated, setAuthenticated] = useState(false);

  // Modal visibility states
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showItineraryManager, setShowItineraryManager] = useState(false);

  // Save confirmation
  const [saveMsg, setSaveMsg] = useState('');
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Stats
  const stats = useMemo(() => {
    const totalMedia = trips.reduce((sum, tr) => sum + tr.media.length, 0);
    const uniqueLocations = new Set(trips.map((tr) => tr.locationName.split(',').pop()?.trim())).size;
    return { totalMedia, uniqueLocations };
  }, [trips]);

  // Pulse animation for empty state
  useEffect(() => {
    if (trips.length === 0) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [trips.length, pulseAnim]);

  // Lock orientation + fullscreen immersive mode
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      NavigationBar.setBackgroundColorAsync('transparent').catch(() => {});
    }
  }, []);

  // Load trips and itineraries
  useEffect(() => {
    (async () => {
      try {
        const [savedTrips, savedItineraries] = await Promise.all([
          StorageService.loadTrips(),
          StorageService.loadItineraries(),
        ]);
        setTrips(savedTrips);
        setItineraries(savedItineraries);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Save trips when changed
  useEffect(() => {
    if (!isLoading) {
      StorageService.saveTrips(trips).catch((error) => console.error('Error saving trips:', error));
    }
  }, [trips, isLoading]);

  // Save itineraries when changed
  useEffect(() => {
    if (!isLoading) {
      StorageService.saveItineraries(itineraries).catch((error) => console.error('Error saving itineraries:', error));
    }
  }, [itineraries, isLoading]);

  // Biometric auth on startup
  useEffect(() => {
    if (!isSettingsLoaded) return;
    if (!settings.biometricEnabled) { setAuthenticated(true); return; }
    (async () => {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('biometricPrompt') as string,
        });
        setAuthenticated(result.success);
      } catch {
        setAuthenticated(false);
      }
    })();
  }, [isSettingsLoaded, settings.biometricEnabled, t]);

  const generateId = useCallback((): string => {
    return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
  }, []);

  const handleSaveTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    let tripId: string;
    if (editingTrip) {
      tripId = editingTrip.id;
      setTrips((prev) => prev.map((tr) => tr.id === editingTrip.id ? { ...tr, ...tripData } : tr));
      setEditingTrip(null);
    } else {
      tripId = generateId();
      const newTrip: Trip = { ...tripData, id: tripId, createdAt: Date.now() };
      setTrips((prev) => [...prev, newTrip]);
    }
    // Update itinerary membership
    if (tripData.itineraryId) {
      setItineraries((prev) => prev.map((it) => {
        if (it.id === tripData.itineraryId) {
          const ids = it.tripIds.includes(tripId) ? it.tripIds : [...it.tripIds, tripId];
          return { ...it, tripIds: ids };
        }
        // Remove from other itineraries
        return { ...it, tripIds: it.tripIds.filter((id) => id !== tripId) };
      }));
    } else {
      // Remove from all itineraries
      setItineraries((prev) => prev.map((it) => ({
        ...it, tripIds: it.tripIds.filter((id) => id !== tripId),
      })));
    }
    setShowForm(false);
    setSaveMsg(t('saved') as string);
    setShowSaveConfirm(true);
  }, [editingTrip, generateId, t]);

  const handleDeleteTrip = useCallback(async (tripId: string) => {
    setTrips((prevTrips) => {
      const updatedTrips = prevTrips.filter((t) => t.id !== tripId);
      StorageService.saveTrips(updatedTrips);
      return updatedTrips;
    });
    setSelectedTrip(null);
  }, []);

  const handleToggleFavorite = useCallback((tripId: string) => {
    setTrips((prev) => prev.map((tr) =>
      tr.id === tripId ? { ...tr, isFavorite: !tr.isFavorite } : tr
    ));
  }, []);

  const handleEditTrip = useCallback((trip: Trip) => {
    setEditingTrip(trip);
    setShowForm(true);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingTrip(null);
  }, []);

  const handleCreateItinerary = useCallback((name: string) => {
    const newIt: Itinerary = { id: generateId(), name, tripIds: [], createdAt: Date.now() };
    setItineraries((prev) => [...prev, newIt]);
    setSaveMsg(t('saved') as string);
    setShowSaveConfirm(true);
  }, [generateId, t]);

  const handleDeleteItinerary = useCallback((id: string) => {
    setItineraries((prev) => prev.filter((it) => it.id !== id));
    setTrips((prev) => prev.map((tr) =>
      tr.itineraryId === id ? { ...tr, itineraryId: undefined } : tr
    ));
  }, []);

  const handleRenameItinerary = useCallback((id: string, newName: string) => {
    setItineraries((prev) => prev.map((it) =>
      it.id === id ? { ...it, name: newName } : it
    ));
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    updateSettings({ hasSeenOnboarding: true });
  }, [updateSettings]);

  const handleGDPRAccept = useCallback(() => {
    updateSettings({ hasAcceptedGDPR: true });
  }, [updateSettings]);

  const handleExitApp = useCallback(() => {
    Alert.alert(
      t('exitApp') as string,
      t('exitConfirm') as string,
      [
        { text: t('no') as string, style: 'cancel' },
        { text: t('yes') as string, onPress: () => BackHandler.exitApp() },
      ]
    );
  }, [t]);

  const handleCastScreen = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.CAST_SETTINGS').catch(() => {
        Linking.openSettings().catch(() => {});
      });
    }
  }, []);

  // Loading state
  if (!isSettingsLoaded || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  // Biometric gate
  if (settings.biometricEnabled && !authenticated) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="lock-closed" size={48} color="#00d4ff" />
        <Text style={{ color: '#9CA3AF', marginTop: 16 }}>{t('biometricPrompt')}</Text>
      </View>
    );
  }

  // Onboarding
  if (!settings.hasSeenOnboarding) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />;
  }

  return (
    <View style={styles.container}>
      {/* GDPR Consent */}
      {!settings.hasAcceptedGDPR && (
        <GDPRConsent
          visible={!settings.hasAcceptedGDPR}
          onAccept={handleGDPRAccept}
          onShowPrivacy={() => setShowPrivacy(true)}
        />
      )}

      {/* Layer 0: Globe */}
      <EarthGlobe
        trips={trips}
        onPinClick={(trip) => setSelectedTrip(trip)}
        targetCoordinates={selectedTrip ? { latitude: selectedTrip.latitude, longitude: selectedTrip.longitude } : null}
        homeLocation={settings.homeLocation || null}
        itineraries={itineraries}
      />

      {/* Layer 1: UI overlay */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        <SafeAreaView style={styles.headerContainer} edges={['top', 'left']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidebarOpen(true)}>
              <Ionicons name="menu" size={28} color="#60A5FA" />
            </TouchableOpacity>
            <View>
              <Text style={styles.logo}>{t('appName')}</Text>
              <Text style={styles.logoSubtitle}>{t('appSubtitle')}</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Offline banner */}
        <OfflineBanner />

        {/* Top-right buttons */}
        <View style={styles.topRightButtons}>
          <TouchableOpacity style={styles.topButton} onPress={handleCastScreen}>
            <Ionicons name="tv-outline" size={16} color="#00d4ff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.topButton, styles.exitButton]} onPress={handleExitApp}>
            <Ionicons name="power" size={16} color="#EF4444" />
          </TouchableOpacity>
          <View style={styles.statusIndicatorInline}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>{t('version')}</Text>
          </View>
        </View>

        {/* Bottom-left stats */}
        <View style={styles.statsBar}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="airplane" size={13} color="#00d4ff" />
              <Text style={styles.statValue}>{trips.length}</Text>
              <Text style={styles.statLabel}>{trips.length === 1 ? t('trip_s') : t('trips_p')}</Text>
            </View>
            {trips.length > 0 && (
              <>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="images-outline" size={13} color="#00d4ff" />
                  <Text style={styles.statValue}>{stats.totalMedia}</Text>
                  <Text style={styles.statLabel}>{t('media')}</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Ionicons name="flag-outline" size={13} color="#00d4ff" />
                  <Text style={styles.statValue}>{stats.uniqueLocations}</Text>
                  <Text style={styles.statLabel}>{stats.uniqueLocations === 1 ? t('country_s') : t('countries_p')}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Welcome overlay */}
        {trips.length === 0 && (
          <View style={styles.welcomeOverlay} pointerEvents="box-none">
            <View style={styles.welcomeCard}>
              <View style={styles.welcomeIconRow}><Ionicons name="earth" size={28} color="#00d4ff" /></View>
              <Text style={styles.welcomeTitle}>{t('startAdventure')}</Text>
              <Text style={styles.welcomeText}>{t('welcomeText')}</Text>
              <View style={styles.welcomeArrow}><Ionicons name="arrow-forward" size={16} color="rgba(0,212,255,0.5)" /></View>
            </View>
          </View>
        )}

        {/* Add buttons */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity style={styles.itineraryButton} onPress={() => setShowItineraryManager(true)}>
            <Ionicons name="git-merge-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={styles.addButtonText}>{t('addTrip')}</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Save confirmation toast */}
      <SaveConfirmation visible={showSaveConfirm} message={saveMsg} onDone={() => setShowSaveConfirm(false)} />

      {/* Layer 2: Modals */}
      <TripForm visible={showForm} onClose={handleCloseForm} onSave={handleSaveTrip} editTrip={editingTrip} itineraries={itineraries} />
      <MemoryViewer trip={selectedTrip} visible={!!selectedTrip}
        onClose={() => setSelectedTrip(null)} onDelete={handleDeleteTrip} onEdit={handleEditTrip} />
      <TripSidebar trips={trips} visible={sidebarOpen} onClose={() => setSidebarOpen(false)}
        onTripSelect={(trip) => setSelectedTrip(trip)} onDelete={handleDeleteTrip}
        onToggleFavorite={handleToggleFavorite}
        onOpenSettings={() => setShowSettings(true)}
        onOpenStats={() => setShowStats(true)}
        onOpenCalendar={() => setShowCalendar(true)}
        homeLocation={settings.homeLocation || null} />

      {/* Settings & screens */}
      <SettingsScreen visible={showSettings} onClose={() => setShowSettings(false)}
        trips={trips} onTripsUpdate={setTrips}
        onShowPrivacy={() => setShowPrivacy(true)} onShowTerms={() => setShowTerms(true)}
        onItinerariesReset={() => setItineraries([])} />
      {showPrivacy && <PrivacyPolicy visible={showPrivacy} onClose={() => setShowPrivacy(false)} />}
      {showTerms && <TermsOfService visible={showTerms} onClose={() => setShowTerms(false)} />}
      {showStats && <StatsScreen visible={showStats} onClose={() => setShowStats(false)} trips={trips} />}
      {showCalendar && <CalendarView visible={showCalendar} onClose={() => setShowCalendar(false)}
        trips={trips} onTripSelect={(trip) => { setSelectedTrip(trip); setShowCalendar(false); }} />}
      <ItineraryManager visible={showItineraryManager} onClose={() => setShowItineraryManager(false)}
        itineraries={itineraries} trips={trips}
        onCreateItinerary={handleCreateItinerary}
        onDeleteItinerary={handleDeleteItinerary}
        onRenameItinerary={handleRenameItinerary} />
    </View>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <AppProvider>
      <SafeAreaProvider>
        <StatusBar style="light" translucent backgroundColor="transparent" />
        <AppContent />
      </SafeAreaProvider>
    </AppProvider>
  </ErrorBoundary>
);

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: '#050510', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#050510' },
  uiOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 10, elevation: 10 },
  headerContainer: { position: 'absolute', top: 0, left: 0, padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hamburgerButton: {
    padding: 14, borderRadius: 14, backgroundColor: 'rgba(96,165,250,0.15)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.25)',
    ...Platform.select({ android: { elevation: 12 } }),
  },
  logo: { fontWeight: '900', fontSize: 28, color: '#60A5FA', letterSpacing: 2 },
  logoSubtitle: { fontSize: 10, color: 'rgba(0,212,255,0.5)', letterSpacing: 3, textTransform: 'uppercase', marginTop: -2 },
  topRightButtons: {
    position: 'absolute', top: 24, right: 20, flexDirection: 'row', alignItems: 'center', gap: 8,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  topButton: {
    backgroundColor: 'rgba(5,5,20,0.7)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    borderRadius: 20, width: 36, height: 36, justifyContent: 'center', alignItems: 'center',
  },
  exitButton: {
    borderColor: 'rgba(239,68,68,0.2)',
  },
  statusIndicatorInline: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(5,5,20,0.5)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  statusText: { color: 'rgba(156,163,175,0.6)', fontSize: 10, fontWeight: '500', letterSpacing: 1 },
  statsBar: {
    position: 'absolute', bottom: 20, left: 20, backgroundColor: 'rgba(5,5,20,0.7)',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 8,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { color: '#F0F0F0', fontSize: 13, fontWeight: '700' },
  statLabel: { color: 'rgba(156,163,175,0.8)', fontSize: 11 },
  statDivider: { width: 1, height: 14, backgroundColor: 'rgba(0,212,255,0.2)' },
  welcomeOverlay: { position: 'absolute', bottom: 100, right: 20, alignItems: 'flex-end' },
  welcomeCard: {
    backgroundColor: 'rgba(5,5,20,0.75)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, maxWidth: 260,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  welcomeIconRow: { marginBottom: 8 },
  welcomeTitle: { color: '#F0F0F0', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  welcomeText: { color: 'rgba(156,163,175,0.9)', fontSize: 12, lineHeight: 18 },
  welcomeArrow: { alignItems: 'flex-end', marginTop: 8 },
  addButtonContainer: { position: 'absolute', bottom: 28, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  itineraryButton: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 50, width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({ android: { elevation: 12 } }),
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B82F6',
    borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
    ...Platform.select({ android: { elevation: 12 } }),
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
});

export default App;
