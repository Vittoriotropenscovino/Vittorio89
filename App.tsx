import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Animated, Easing, BackHandler, Alert, Linking, AppState,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import HelpGuide from './src/components/HelpGuide';
import PaywallScreen from './src/components/PaywallScreen';
import PinSelector from './src/components/PinSelector';
import { useTrips, useModals, useAuth, useFogOfWar, usePurchase } from './src/hooks';
import { Trip } from './src/types';
import { clusterTrips } from './src/utils/clusterTrips';

const AppContent: React.FC = () => {
  const { t, settings, updateSettings, isSettingsLoaded } = useApp();

  const {
    trips, setTrips, itineraries, setItineraries, isLoading,
    saveTrip, deleteTrip, toggleFavorite,
    createItinerary, deleteItinerary, renameItinerary,
  } = useTrips(t);

  const {
    activeModal, selectedTrip, sidebarOpen, editingTrip,
    showSaveConfirm, saveMsg,
    openModal, closeModal, selectTrip, startEditTrip, closeForm,
    setSidebarOpen, showSaveToast, hideSaveToast,
  } = useModals();

  const { authenticated } = useAuth(settings.biometricEnabled, isSettingsLoaded, t);
  const visitedCountries = useFogOfWar(trips);
  const { isPremium, price, purchase, restore, canAddTrip, remainingFreeTrips, FREE_TRIP_LIMIT, setDevMode } = usePurchase();

  // Flythrough animation
  const [flythroughStops, setFlythroughStops] = useState<{ lat: number; lng: number }[] | null>(null);
  // Auto-fly to newly saved trip
  const [autoFlyTarget, setAutoFlyTarget] = useState<{ latitude: number; longitude: number } | null>(null);
  // Pin selector popup for nearby pins
  const [pinSelectorVisible, setPinSelectorVisible] = useState(false);
  const [pinSelectorTrips, setPinSelectorTrips] = useState<Trip[]>([]);

  // Pulse animation
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Clustered pins — recomputed when trips or home location change
  const clusteredPins = useMemo(
    () => clusterTrips(trips, settings.homeLocation || null),
    [trips, settings.homeLocation]
  );

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

  // Hide Android navigation bar
  const hideNavigationBar = useCallback(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      NavigationBar.setBackgroundColorAsync('transparent').catch(() => {});
    }
  }, []);

  // Lock orientation + fullscreen immersive mode
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
    hideNavigationBar();
  }, [hideNavigationBar]);

  // Re-apply immersive mode when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') hideNavigationBar();
    });
    return () => sub.remove();
  }, [hideNavigationBar]);

  // Clear autoFlyTarget after it's been consumed
  useEffect(() => {
    if (autoFlyTarget) {
      const timer = setTimeout(() => setAutoFlyTarget(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [autoFlyTarget]);

  const handleSaveTrip = useCallback((tripData: Omit<Trip, 'id' | 'createdAt'>) => {
    saveTrip(tripData, editingTrip);
    closeForm();
    showSaveToast(t('saved') as string);
    setAutoFlyTarget({ latitude: tripData.latitude, longitude: tripData.longitude });
  }, [editingTrip, saveTrip, t, closeForm, showSaveToast]);

  const handleAddTrip = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    const nonWishlistTrips = trips.filter(t => !t.isWishlist).length;
    if (canAddTrip(nonWishlistTrips)) {
      openModal('form');
    } else {
      openModal('paywall');
    }
  }, [trips, canAddTrip, openModal]);

  const openModalWithHaptic = useCallback((modal: Parameters<typeof openModal>[0]) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    openModal(modal);
  }, [openModal]);

  const handleDeleteTrip = useCallback(async (tripId: string) => {
    await deleteTrip(tripId);
    selectTrip(null);
  }, [deleteTrip, selectTrip]);

  const handleCreateItinerary = useCallback((name: string) => {
    createItinerary(name);
    showSaveToast(t('saved') as string);
  }, [createItinerary, t, showSaveToast]);

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

  const handleToggleTravelLines = useCallback(() => {
    updateSettings({ showTravelLines: !(settings.showTravelLines !== false) });
  }, [settings.showTravelLines, updateSettings]);

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

  // GDPR gate
  if (!settings.hasAcceptedGDPR) {
    return (
      <View style={styles.container}>
        <GDPRConsent
          visible={true}
          onAccept={handleGDPRAccept}
          onShowPrivacy={() => openModal('privacy')}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Layer 0: Globe */}
      <EarthGlobe
        trips={trips}
        clusteredPins={clusteredPins}
        onPinClick={(trip, clusterTripList) => {
          if (clusterTripList && clusterTripList.length > 1) {
            setPinSelectorTrips(clusterTripList);
            setPinSelectorVisible(true);
          } else {
            selectTrip(trip);
          }
        }}
        targetCoordinates={selectedTrip ? { latitude: selectedTrip.latitude, longitude: selectedTrip.longitude } : autoFlyTarget}
        homeLocation={settings.homeLocation || null}
        itineraries={itineraries}
        showTravelLines={settings.showTravelLines !== false}
        visitedCountries={visitedCountries}
        flythroughStops={flythroughStops}
        selectedTripId={selectedTrip?.id || null}
      />

      {/* Layer 1: UI overlay */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        <SafeAreaView style={styles.headerContainer} edges={['top', 'left']}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.hamburgerButton} onPress={() => setSidebarOpen(true)} accessibilityLabel="Menu" accessibilityRole="button">
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
          <TouchableOpacity style={[styles.topButton, styles.exitButton]} onPress={handleExitApp} accessibilityLabel="Exit" accessibilityRole="button">
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
              <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
              <View style={styles.welcomeIconRow}><Ionicons name="earth" size={28} color="#00d4ff" /></View>
              <Text style={styles.welcomeTitle}>{t('startAdventure')}</Text>
              <Text style={styles.welcomeText}>{t('welcomeText')}</Text>
              <View style={styles.welcomeArrow}><Ionicons name="arrow-forward" size={16} color="rgba(0,212,255,0.5)" /></View>
            </View>
          </View>
        )}

        {/* Add buttons */}
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={[styles.travelLinesButton, settings.showTravelLines === false && styles.travelLinesButtonOff]}
            onPress={handleToggleTravelLines}
          >
            <Ionicons name="git-network-outline" size={20} color={settings.showTravelLines !== false ? '#F59E0B' : '#6B7280'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.itineraryButton} onPress={() => openModalWithHaptic('itineraryManager')}>
            <Ionicons name="git-merge-outline" size={20} color="#F59E0B" />
          </TouchableOpacity>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity style={styles.addButton} onPress={handleAddTrip} accessibilityLabel="Add Trip" accessibilityRole="button">
              <Ionicons name="add" size={28} color="#fff" />
              <Text style={styles.addButtonText}>{t('addTrip')}</Text>
            </TouchableOpacity>
          </Animated.View>
          {!isPremium && (() => {
            const nwc = trips.filter(tr => !tr.isWishlist).length;
            const rem = FREE_TRIP_LIMIT - nwc;
            if (nwc > 0 && rem > 0) {
              return (
                <Text style={[styles.freeTripsIndicator, rem <= 1 && { color: '#EF4444' }]}>
                  {String(t('freeTripsRemaining')).replace('{0}', String(rem))}
                </Text>
              );
            }
            return null;
          })()}
        </View>
      </View>

      {/* Save confirmation toast */}
      <SaveConfirmation visible={showSaveConfirm} message={saveMsg} onDone={hideSaveToast} />

      {/* Layer 2: Modals */}
      <TripForm visible={activeModal === 'form'} onClose={closeForm} onSave={handleSaveTrip} editTrip={editingTrip} itineraries={itineraries} />
      <MemoryViewer trip={selectedTrip} visible={!!selectedTrip}
        onClose={() => selectTrip(null)} onDelete={handleDeleteTrip} onEdit={startEditTrip} />
      <TripSidebar trips={trips} visible={sidebarOpen} onClose={() => setSidebarOpen(false)}
        onTripSelect={(trip) => selectTrip(trip)} onDelete={handleDeleteTrip}
        onToggleFavorite={toggleFavorite}
        onOpenSettings={() => openModalWithHaptic('settings')}
        onOpenStats={() => openModalWithHaptic('stats')}
        onOpenCalendar={() => openModalWithHaptic('calendar')}
        onOpenHelpGuide={() => openModalWithHaptic('helpGuide')}
        homeLocation={settings.homeLocation || null} />

      {/* Settings & screens */}
      <SettingsScreen visible={activeModal === 'settings'} onClose={() => closeModal()}
        trips={trips} itineraries={itineraries} onTripsUpdate={setTrips}
        onShowPrivacy={() => openModal('privacy')} onShowTerms={() => openModal('terms')}
        onShowHelpGuide={() => openModal('helpGuide')}
        onItinerariesReset={() => setItineraries([])}
        isPremium={isPremium} price={price} onPurchase={purchase} onRestore={restore}
        onDevModeToggle={setDevMode} />
      {activeModal === 'privacy' && <PrivacyPolicy visible={activeModal === 'privacy'} onClose={() => closeModal()} />}
      {activeModal === 'terms' && <TermsOfService visible={activeModal === 'terms'} onClose={() => closeModal()} />}
      {activeModal === 'helpGuide' && <HelpGuide visible={activeModal === 'helpGuide'} onClose={() => closeModal()} />}
      {activeModal === 'paywall' && (
        <PaywallScreen
          visible={activeModal === 'paywall'}
          onClose={() => closeModal()}
          price={price}
          freeLimit={FREE_TRIP_LIMIT}
          onPurchase={async () => {
            const success = await purchase();
            if (success) closeModal();
            return success;
          }}
          onRestore={async () => {
            const success = await restore();
            if (success) closeModal();
            return success;
          }}
        />
      )}
      {activeModal === 'stats' && <StatsScreen visible={activeModal === 'stats'} onClose={() => closeModal()} trips={trips} />}
      {activeModal === 'calendar' && <CalendarView visible={activeModal === 'calendar'} onClose={() => closeModal()}
        trips={trips} onTripSelect={(trip) => { selectTrip(trip); closeModal(); }} />}
      <ItineraryManager visible={activeModal === 'itineraryManager'} onClose={() => closeModal()}
        itineraries={itineraries} trips={trips}
        onCreateItinerary={handleCreateItinerary}
        onDeleteItinerary={deleteItinerary}
        onRenameItinerary={renameItinerary}
        onFlythrough={(stops) => {
          // Remap stops through clusters: dedupe consecutive stops that fall in the same cluster
          const remapped: { lat: number; lng: number }[] = [];
          const seen = new Set<string>();
          for (const s of stops) {
            const cluster = clusteredPins.find((c) =>
              Math.abs(c.latitude - s.lat) < 0.0001 && Math.abs(c.longitude - s.lng) < 0.0001
            ) || clusteredPins.find((c) => {
              // Fallback: find cluster whose tripIds contain a trip matching these coordinates
              return trips.some((t) =>
                c.tripIds.indexOf(t.id) !== -1 &&
                Math.abs(t.latitude - s.lat) < 0.0001 &&
                Math.abs(t.longitude - s.lng) < 0.0001
              );
            });
            if (!cluster || seen.has(cluster.id)) continue;
            seen.add(cluster.id);
            remapped.push({ lat: cluster.latitude, lng: cluster.longitude });
          }
          if (remapped.length >= 2) {
            setFlythroughStops(remapped);
            setTimeout(() => setFlythroughStops(null), 500);
          }
        }} />
      <PinSelector
        visible={pinSelectorVisible}
        trips={pinSelectorTrips}
        onSelect={(trip) => selectTrip(trip)}
        onClose={() => { setPinSelectorVisible(false); setPinSelectorTrips([]); }}
        t={t}
      />
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
    backgroundColor: 'rgba(5,5,20,0.4)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
    borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, maxWidth: 260,
    overflow: 'hidden',
    ...Platform.select({ android: { elevation: 12 } }),
  },
  welcomeIconRow: { marginBottom: 8 },
  welcomeTitle: { color: '#F0F0F0', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  welcomeText: { color: 'rgba(156,163,175,0.9)', fontSize: 12, lineHeight: 18 },
  welcomeArrow: { alignItems: 'flex-end', marginTop: 8 },
  addButtonContainer: { position: 'absolute', bottom: 28, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  travelLinesButton: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 50, width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({ android: { elevation: 12 } }),
  },
  travelLinesButtonOff: {
    backgroundColor: 'rgba(107,114,128,0.15)', borderColor: 'rgba(107,114,128,0.3)',
  },
  itineraryButton: {
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 50, width: 44, height: 44, justifyContent: 'center', alignItems: 'center',
    ...Platform.select({ android: { elevation: 12 } }),
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00d4ff',
    borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.5)',
    shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  freeTripsIndicator: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginTop: 4 },
});

export default App;
