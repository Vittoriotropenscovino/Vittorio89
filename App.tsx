import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Platform, Animated, Easing, Alert, Linking, AppState, ScrollView, StyleProp, ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as NavigationBar from 'expo-navigation-bar';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

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
import CountryPickerScreen from './src/components/CountryPickerScreen';
import CountriesResultPanel from './src/components/CountriesResultPanel';
import MarkedCountryDialog from './src/components/MarkedCountryDialog';
import ShareGlobeSheet from './src/components/ShareGlobeSheet';
import CardPreviewDev from './src/components/CardPreviewDev';
import RecapNotice from './src/components/RecapNotice';
import { useTrips, useModals, useAuth, useFogOfWar, usePurchase } from './src/hooks';
import { Trip } from './src/types';
import { clusterTrips } from './src/utils/clusterTrips';
import { getTravelStats } from './src/utils/travelStats';
import { getVisitedCountries } from './src/utils/visitedCountries';
import { globeTargetFor } from './src/utils/countryPicker';
import { useOrientation } from './src/hooks/useOrientation';
import { countryName } from './src/utils/countries';
import { dismissRecapYear, getYearRecap, recapCampaign, recapNoticeYear } from './src/utils/yearRecap';

// Emulator test build (EXPO_PUBLIC_ROTAZIONE_LIBERA=1): adds the full-size card
// preview. Since 1.4.0 every build rotates freely (portrait is the main mode).
const FREE_ROTATION = process.env.EXPO_PUBLIC_ROTAZIONE_LIBERA === '1';
// Test tools (emulator build and the side-by-side "TravelSphere Prova" APK only,
// never the store build): a button that simulates the phone date, so the year
// recap can be tried before December.
const TEST_TOOLS = FREE_ROTATION || process.env.EXPO_PUBLIC_STRUMENTI_PROVA === '1';
const TEST_DATES: (null | [number, number, number])[] = [null, [15, 12, 2026], [10, 1, 2027], [15, 6, 2027], [15, 12, 2027]];

const AppContent: React.FC = () => {
  const { t, language, settings, updateSettings, isSettingsLoaded } = useApp();
  // API 36 enforces edge-to-edge with no opt-out: the absolutely-positioned
  // overlays below would otherwise sit under the system bars / camera cutout,
  // which in landscape means the left or right edge, not just top/bottom.
  const insets = useSafeAreaInsets();
  const { isPortrait, height: winH } = useOrientation();

  const {
    trips, setTrips, itineraries, setItineraries, isLoading,
    markedCountries, setMarkedCountries,
    saveTrip, deleteTrip, toggleFavorite,
    createItinerary, deleteItinerary, renameItinerary,
  } = useTrips(t);

  const {
    activeModal, selectedTrip, sidebarOpen, editingTrip,
    showSaveConfirm, saveMsg,
    openModal, closeModal, selectTrip, startEditTrip, closeForm,
    setSidebarOpen, showSaveToast, hideSaveToast,
  } = useModals();

  const { authenticated, retry: retryAuth } = useAuth(settings.biometricEnabled, isSettingsLoaded, t);
  // Lit countries = trips' countries ∪ marked countries (getVisitedCountries).
  const visitedCountries = useFogOfWar(trips, markedCountries);
  const { isPremium, price, purchase, restore, canAddTrip, remainingFreeTrips, FREE_TRIP_LIMIT, setDevMode } = usePurchase();

  // Flythrough animation
  const [flythroughStops, setFlythroughStops] = useState<{ lat: number; lng: number }[] | null>(null);
  // Auto-fly to newly saved trip
  const [autoFlyTarget, setAutoFlyTarget] = useState<{ latitude: number; longitude: number } | null>(null);
  // Pin selector popup for nearby pins
  const [pinSelectorVisible, setPinSelectorVisible] = useState(false);
  const [pinSelectorTrips, setPinSelectorTrips] = useState<Trip[]>([]);

  // "Where have you been?": 'firstRun' right after onboarding + privacy consent,
  // 'normal' from the button on the main screen, null = closed.
  const [countryPicker, setCountryPicker] = useState<null | 'firstRun' | 'normal'>(null);
  const [countriesResultVisible, setCountriesResultVisible] = useState(false);
  // "Add a trip here" (tap on a country marked from the list): the app's own dialog.
  const [markedDialog, setMarkedDialog] = useState<{ code: string; name: string } | null>(null);
  // "Add a trip here" from a marked country: the form starts with its name.
  const [prefillCountry, setPrefillCountry] = useState<{ code: string; name: string } | null>(null);
  // "Share your globe" sheet (preview + optional name + share), from the main
  // screen button and from the result panel.
  const [shareSheetVisible, setShareSheetVisible] = useState(false);
  const [cardPreviewDev, setCardPreviewDev] = useState(false);
  // Year recap ("My {year} in travel"): notice 1 Dec – 31 Jan, closed per year.
  const [recapSheetVisible, setRecapSheetVisible] = useState(false);
  const [testDateIndex, setTestDateIndex] = useState(0);
  const testDate = TEST_TOOLS ? TEST_DATES[testDateIndex % TEST_DATES.length] : null;
  const now = testDate ? new Date(testDate[2], testDate[1] - 1, testDate[0], 12) : new Date();
  const noticeYear = recapNoticeYear(now, settings.recapDismissedYears);
  const yearRecap = useMemo(
    () => (noticeYear === null ? null : getYearRecap(trips, markedCountries, noticeYear)),
    [noticeYear, trips, markedCountries]
  );

  // Countries that come from trips: on and locked in the picker ("from your diary").
  const diaryCountries = useMemo(() => getVisitedCountries(trips).codes, [trips]);

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
    // Distinct countries must come from getTravelStats, the same source the
    // Statistics screen uses. Counting the tail of locationName here instead
    // over-counted: "Roma, Lazio, Italia" and "Milan, Italy" looked like two
    // countries, while getTravelStats collapses both onto countryCode "IT".
    // Trips and countries both leave out wishlist places, like the share card.
    // Countries also include the ones marked in "Where have you been?".
    const travelStats = getTravelStats(trips, markedCountries);
    const countries = travelStats.countries;
    const visitedTrips = travelStats.trips;
    return { totalMedia, countries, visitedTrips, travelStats };
  }, [trips, markedCountries]);

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

  // Hide Android navigation bar.
  // Targeting API 36 forces edge-to-edge, where setBehaviorAsync and
  // setBackgroundColorAsync are no-ops that only log warnings — swipe-to-reveal
  // and a transparent bar are the built-in behaviour there, so we just hide it.
  const hideNavigationBar = useCallback(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    }
  }, []);

  // 1.4.0: portrait is the main mode and the phone rotates freely (turning it
  // gives the landscape layout). No lock any more. Fullscreen immersive mode.
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});
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
    // A wishlist place turned into a visited trip counts against the free limit,
    // like a new trip from "+": otherwise the limit could be skipped this way.
    if (editingTrip?.isWishlist && !tripData.isWishlist) {
      const nonWishlistTrips = trips.filter(tr => !tr.isWishlist).length;
      if (!canAddTrip(nonWishlistTrips)) {
        closeForm();
        openModal('paywall');
        return;
      }
    }
    saveTrip(tripData, editingTrip);
    closeForm();
    showSaveToast(t('saved') as string);
    setAutoFlyTarget({ latitude: tripData.latitude, longitude: tripData.longitude });
  }, [editingTrip, saveTrip, t, closeForm, showSaveToast, trips, canAddTrip, openModal]);

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
    // First run only: right after the consent, if there is nothing yet. Users who
    // accepted in an older version never pass here again, so nobody who updates
    // gets a forced screen; they find it on the main screen button.
    if (trips.length === 0 && markedCountries.length === 0) {
      setCountryPicker('firstRun');
    }
  }, [updateSettings, trips.length, markedCountries.length]);

  const handleCountriesConfirm = useCallback((nextMarked: string[]) => {
    setMarkedCountries(nextMarked);
    setCountryPicker(null);
    const visited = getVisitedCountries(trips, nextMarked);
    // Turn the globe towards the biggest group of lit countries.
    const target = globeTargetFor(visited.codes);
    if (target) setAutoFlyTarget(target);
    setCountriesResultVisible(visited.count > 0);
  }, [setMarkedCountries, trips]);

  const handleShareGlobe = useCallback(() => {
    setCountriesResultVisible(false);
    setShareSheetVisible(true);
  }, []);

  const handleDismissRecap = useCallback(() => {
    if (noticeYear === null) return;
    updateSettings({ recapDismissedYears: dismissRecapYear(settings.recapDismissedYears, noticeYear) });
  }, [noticeYear, settings.recapDismissedYears, updateSettings]);

  // Tap on a country on the globe: a country marked from the list (not from a
  // trip) offers "Add a trip here" (MarkedCountryDialog), with the usual
  // free-limit rules.
  const handleCountryClick = useCallback((code: string) => {
    if (!markedCountries.includes(code) || diaryCountries.includes(code)) return;
    setMarkedDialog({ code, name: countryName(code, language) });
  }, [markedCountries, diaryCountries, language]);

  const handleMarkedAddTrip = useCallback(({ code, name }: { code: string; name: string }) => {
    setMarkedDialog(null);
    const nonWishlistTrips = trips.filter((tr) => !tr.isWishlist).length;
    if (canAddTrip(nonWishlistTrips)) {
      setPrefillCountry({ code, name });
      openModal('form');
    } else {
      openModal('paywall');
    }
  }, [trips, canAddTrip, openModal]);

  // The prefilled country belongs to one form only.
  useEffect(() => {
    if (activeModal !== 'form') setPrefillCountry(null);
  }, [activeModal]);

  // The result panel floats over the globe: as soon as anything else opens on
  // top (a form, settings, a trip, the menu) it is done and goes away.
  useEffect(() => {
    if (activeModal !== 'none' || selectedTrip || sidebarOpen) setCountriesResultVisible(false);
  }, [activeModal, selectedTrip, sidebarOpen]);

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
        <TouchableOpacity onPress={retryAuth} accessibilityRole="button"
          style={{ marginTop: 28, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 24, backgroundColor: 'rgba(0,212,255,0.15)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.5)' }}>
          <Text style={{ color: '#00d4ff', fontSize: 16, fontWeight: '600' }}>{t('biometricRetry')}</Text>
        </TouchableOpacity>
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
        {/* The privacy policy must be readable BEFORE accepting the consent */}
        {activeModal === 'privacy' && <PrivacyPolicy visible onClose={() => closeModal()} />}
      </View>
    );
  }

  // ---- Main screen pieces, shared by the landscape and the portrait layout ----
  const globeH = Math.round(winH * 0.58);
  const showWelcome = trips.length === 0 && !countriesResultVisible;
  const routesOn = settings.showTravelLines !== false;

  // The numbers bar: ONE bar, always the same three numbers, a tap opens
  // Statistics (written on the bar, like every button). 1.4.0: the countries,
  // i.e. what is "visited", are in gold.
  const statsBar = (style: StyleProp<ViewStyle>) => (
    <TouchableOpacity
      testID="stats-bar"
      style={style}
      onPress={() => openModalWithHaptic('stats')}
      accessibilityRole="button"
      accessibilityLabel={t('statistics') as string}
      activeOpacity={0.7}
    >
      <View style={[styles.statsRow, isPortrait && styles.statsRowPortrait]}>
        <View style={styles.statItem}>
          <Ionicons name="airplane" size={13} color="#00d4ff" />
          <Text style={styles.statValue}>{stats.visitedTrips}</Text>
          <Text style={styles.statLabel}>{stats.visitedTrips === 1 ? t('trip_s') : t('trips_p')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="images-outline" size={13} color="#00d4ff" />
          <Text style={styles.statValue}>{stats.totalMedia}</Text>
          <Text style={styles.statLabel}>{t('media')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="flag-outline" size={13} color="#FBBF24" />
          <Text style={[styles.statValue, styles.statValueGold]}>{stats.countries}</Text>
          <Text style={styles.statLabel}>{stats.countries === 1 ? t('country_s') : t('countries_p')}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="stats-chart" size={13} color="#00d4ff" />
          <Text style={styles.statsOpenText}>{t('statistics') as string}</Text>
          <Ionicons name="chevron-forward" size={13} color="#00d4ff" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // "Where have you been?": always reachable from the main screen
  const whereBeenButton = (style?: StyleProp<ViewStyle>) => (
    <TouchableOpacity testID="wb-open" style={[styles.whereBeenButton, style]} onPress={() => setCountryPicker('normal')} accessibilityRole="button">
      <Ionicons name="flag" size={16} color="#FBBF24" />
      <Text style={styles.whereBeenText} numberOfLines={1}>{t('wbTitle') as string}</Text>
    </TouchableOpacity>
  );

  // Sharing at the centre: available as soon as there is one country
  const shareButton = (style?: StyleProp<ViewStyle>) => (stats.countries > 0 ? (
    <TouchableOpacity testID="share-open" style={[styles.whereBeenButton, styles.shareButton, style]} onPress={handleShareGlobe} accessibilityRole="button">
      <Ionicons name="share-social" size={16} color="#1C1300" />
      <Text style={[styles.whereBeenText, styles.shareButtonText]} numberOfLines={1}>{t('shareGlobe') as string}</Text>
    </TouchableOpacity>
  ) : null);

  const addTripButton = (style?: StyleProp<ViewStyle>) => (
    <TouchableOpacity testID="Add Trip" style={[styles.addButton, style]} onPress={handleAddTrip} accessibilityLabel="Add Trip" accessibilityRole="button">
      <Ionicons name="add" size={28} color="#fff" />
      <Text style={styles.addButtonText}>{t('addTrip')}</Text>
    </TouchableOpacity>
  );

  // The routes on the globe (home → trips, itineraries): on/off. Written label
  // since 1.4.0: "Routes" in landscape, "Travel routes" in the portrait panel.
  const routesButton = (label: string, style?: StyleProp<ViewStyle>) => (
    <TouchableOpacity
      testID="routes-toggle"
      style={[styles.goldPill, !routesOn && styles.goldPillOff, style]}
      onPress={handleToggleTravelLines}
      accessibilityRole="switch"
      accessibilityState={{ checked: routesOn }}
    >
      <Ionicons name="git-network-outline" size={18} color={routesOn ? '#F59E0B' : '#6B7280'} />
      <Text style={[styles.goldPillText, !routesOn && styles.goldPillTextOff]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );

  const itineraryButton = (style?: StyleProp<ViewStyle>) => (
    <TouchableOpacity testID="itineraries-open" style={[styles.goldPill, style]} onPress={() => openModalWithHaptic('itineraryManager')} accessibilityRole="button">
      <Ionicons name="git-merge-outline" size={18} color="#F59E0B" />
      <Text style={styles.goldPillText} numberOfLines={1}>{t('itineraries') as string}</Text>
    </TouchableOpacity>
  );

  const freeTripsLine = (() => {
    if (isPremium) return null;
    const nwc = trips.filter(tr => !tr.isWishlist).length;
    const rem = FREE_TRIP_LIMIT - nwc;
    if (nwc > 0 && rem > 0) {
      return (
        <Text style={[styles.freeTripsIndicator, isPortrait && styles.freeTripsCentered, rem <= 1 && { color: '#EF4444' }]}>
          {String(t('freeTripsRemaining')).replace('{0}', String(rem))}
        </Text>
      );
    }
    return null;
  })();

  return (
    <View style={styles.container}>
      {/* Layer 0: Globe. Landscape: the whole screen, as before. Portrait (1.4.0):
          the top ~58%, the panel below. Only the style changes on rotation: the
          WebView is never remounted, so the globe does not reload. */}
      <View style={isPortrait ? [styles.globePortrait, { height: globeH }] : StyleSheet.absoluteFill}>
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
          onCountryClick={handleCountryClick}
          flythroughStops={flythroughStops}
          selectedTripId={selectedTrip?.id || null}
        />
      </View>

      {/* Layer 1: UI overlay */}
      <View style={styles.uiOverlay} pointerEvents="box-none">
        <SafeAreaView style={styles.headerContainer} edges={['top', 'left']}>
          <View style={styles.header}>
            <TouchableOpacity testID="Menu" style={styles.hamburgerButton} onPress={() => setSidebarOpen(true)} accessibilityLabel="Menu" accessibilityRole="button">
              <Ionicons name="menu" size={28} color="#60A5FA" />
            </TouchableOpacity>
            <View>
              <Text style={[styles.logo, isPortrait && styles.logoPortrait]}>{t('appName')}</Text>
              <Text style={styles.logoSubtitle}>{t('appSubtitle')}</Text>
            </View>
          </View>
        </SafeAreaView>

        {/* Offline banner */}
        <OfflineBanner />

        {/* Top right: the version (landscape only, no room next to the logo in
            portrait) and the test-build tools. 1.4.0: no "Exit" button any more
            (not needed on Android, refused by Apple); "Cast to TV" is in the menu. */}
        <View style={[styles.topRightButtons, { top: 24 + insets.top, right: 20 + insets.right }]}>
          {!isPortrait && (
            <View style={styles.statusIndicatorInline}>
              <View style={styles.statusDot} />
              <Text style={styles.statusText}>{`v${Constants.expoConfig?.version ?? '1.1.0'}`}</Text>
            </View>
          )}
          {/* Emulator test build only: full-size card samples for the checkpoint PNGs */}
          {FREE_ROTATION && (
            <TouchableOpacity testID="card-dev-open" style={styles.topButton} onPress={() => setCardPreviewDev(true)}>
              <Text style={styles.statusText}>Card</Text>
            </TouchableOpacity>
          )}
          {/* Test builds only: simulated phone date for the year recap */}
          {TEST_TOOLS && (
            <TouchableOpacity
              testID="date-dev"
              style={styles.statusIndicatorInline}
              onPress={() => setTestDateIndex((i) => i + 1)}
              // Long press: the closed notices come back (to try the recap again)
              onLongPress={() => { updateSettings({ recapDismissedYears: [] }); setTestDateIndex(0); }}
            >
              <Text style={styles.statusText}>{testDate ? `${testDate[0]}/${testDate[1]}/${testDate[2]}` : 'Data reale'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Year recap notice (1 Dec – 31 Jan, until closed for that year) */}
        {yearRecap && !countriesResultVisible && !recapSheetVisible && !shareSheetVisible && (
          <RecapNotice
            key={yearRecap.year}
            recap={yearRecap}
            onOpen={() => setRecapSheetVisible(true)}
            onAddTrip={handleAddTrip}
            onDismiss={handleDismissRecap}
          />
        )}

        {isPortrait ? (
          /* Portrait: the panel under the globe, everything within thumb reach.
             Always open: it all fits; on very small phones it scrolls. */
          <View testID="main-panel" style={[styles.panel, { top: globeH - 24 }]}>
            <View style={styles.panelHandle} />
            <ScrollView
              contentContainerStyle={[styles.panelContent, { paddingBottom: 16 + insets.bottom, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {showWelcome && (
                <View style={styles.welcomeRow}>
                  <Ionicons name="earth" size={22} color="#00d4ff" />
                  <View style={styles.welcomeRowText}>
                    <Text style={styles.welcomeTitle}>{t('startAdventure')}</Text>
                    <Text style={styles.welcomeText}>{t('welcomeText')}</Text>
                  </View>
                </View>
              )}
              {statsBar(styles.statsBarPortrait)}
              <View style={styles.panelRow}>
                {whereBeenButton(styles.flex1)}
                {shareButton(styles.flex1)}
              </View>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {addTripButton(styles.addButtonPortrait)}
              </Animated.View>
              {freeTripsLine}
              <View style={styles.panelRow}>
                {itineraryButton(styles.flex1)}
                {routesButton(t('travelRoutes') as string, styles.flex1)}
              </View>
            </ScrollView>
          </View>
        ) : (
          <>
            {statsBar([styles.statsBar, { bottom: 20 + insets.bottom, left: 20 + insets.left }])}

            {/* "Where have you been?" and sharing: always reachable from the main screen */}
            <View style={[styles.mainActions, { bottom: 76 + insets.bottom, left: 20 + insets.left }]}>
              {whereBeenButton()}
              {shareButton()}
            </View>

            {/* Welcome overlay */}
            {showWelcome && (
              <View style={[styles.welcomeOverlay, { bottom: 100 + insets.bottom, right: 20 + insets.right }]} pointerEvents="box-none">
                <View style={styles.welcomeCard}>
                  <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                  <View style={styles.welcomeIconRow}><Ionicons name="earth" size={28} color="#00d4ff" /></View>
                  <Text style={styles.welcomeTitle}>{t('startAdventure')}</Text>
                  <Text style={styles.welcomeText}>{t('welcomeText')}</Text>
                  <View style={styles.welcomeArrow}><Ionicons name="arrow-forward" size={16} color="rgba(0,212,255,0.5)" /></View>
                </View>
              </View>
            )}

            {/* Add buttons: "Routes", "Itineraries" (written labels, 1.4.0), "Add Trip" */}
            <View style={[styles.addButtonContainer, { bottom: 28 + insets.bottom, right: 20 + insets.right }]}>
              {routesButton(t('routes') as string)}
              {itineraryButton()}
              <View style={styles.addColumn}>
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  {addTripButton()}
                </Animated.View>
                {freeTripsLine}
              </View>
            </View>
          </>
        )}
      </View>

      <CountriesResultPanel
        visible={countriesResultVisible}
        count={stats.countries}
        continents={stats.travelStats.continents}
        codes={visitedCountries}
        hasTrips={stats.visitedTrips > 0}
        sharing={false}
        onShare={handleShareGlobe}
        onAddTrip={() => { setCountriesResultVisible(false); handleAddTrip(); }}
        onClose={() => setCountriesResultVisible(false)}
      />
      <MarkedCountryDialog country={markedDialog} onAddTrip={handleMarkedAddTrip} onClose={() => setMarkedDialog(null)} />
      {FREE_ROTATION && <CardPreviewDev visible={cardPreviewDev} onClose={() => setCardPreviewDev(false)} />}
      <ShareGlobeSheet
        visible={shareSheetVisible}
        stats={stats.travelStats}
        visitedCodes={visitedCountries}
        onClose={() => setShareSheetVisible(false)}
      />
      {/* Same sheet, recap card: QR campaign recap{year} */}
      {yearRecap && (
        <ShareGlobeSheet
          visible={recapSheetVisible}
          stats={stats.travelStats}
          visitedCodes={visitedCountries}
          recap={yearRecap}
          campaign={recapCampaign(yearRecap.year)}
          onClose={() => setRecapSheetVisible(false)}
        />
      )}

      {/* Save confirmation toast */}
      <SaveConfirmation visible={showSaveConfirm} message={saveMsg} onDone={hideSaveToast} />

      {/* Layer 2: Modals */}
      <TripForm visible={activeModal === 'form'} onClose={closeForm} onSave={handleSaveTrip} editTrip={editingTrip} itineraries={itineraries} prefillCountry={prefillCountry} />
      <MemoryViewer trip={selectedTrip} visible={!!selectedTrip}
        onClose={() => selectTrip(null)} onDelete={handleDeleteTrip} onEdit={startEditTrip} />
      <TripSidebar trips={trips} visible={sidebarOpen} onClose={() => setSidebarOpen(false)}
        onTripSelect={(trip) => selectTrip(trip)} onDelete={handleDeleteTrip}
        onToggleFavorite={toggleFavorite}
        onOpenSettings={() => openModalWithHaptic('settings')}
        onOpenStats={() => openModalWithHaptic('stats')}
        onOpenCalendar={() => openModalWithHaptic('calendar')}
        onOpenHelpGuide={() => openModalWithHaptic('helpGuide')}
        onCastScreen={Platform.OS === 'android' ? handleCastScreen : undefined}
        homeLocation={settings.homeLocation || null} />

      {/* Settings & screens */}
      <SettingsScreen visible={activeModal === 'settings'} onClose={() => closeModal()}
        trips={trips} itineraries={itineraries} onTripsUpdate={setTrips}
        markedCountries={markedCountries} onMarkedCountriesUpdate={setMarkedCountries}
        onShowPrivacy={() => openModal('privacy')} onShowTerms={() => openModal('terms')}
        onShowHelpGuide={() => openModal('helpGuide')}
        onItinerariesReset={() => setItineraries([])}
        isPremium={isPremium} price={price} onPurchase={purchase} onRestore={restore} freeLimit={FREE_TRIP_LIMIT}
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
      {activeModal === 'stats' && <StatsScreen visible={activeModal === 'stats'} onClose={() => closeModal()} trips={trips} markedCountries={markedCountries} />}
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
      <CountryPickerScreen
        visible={countryPicker !== null}
        firstRun={countryPicker === 'firstRun'}
        trips={trips}
        markedCountries={markedCountries}
        diaryCountries={diaryCountries}
        onConfirm={handleCountriesConfirm}
        onClose={() => setCountryPicker(null)}
      />
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
        {/* Under edge-to-edge (API 36) the bar is always translucent and
            backgroundColor is unsupported, so only the icon style applies. */}
        <StatusBar style="light" />
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
    paddingHorizontal: 14, paddingVertical: 10,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statValue: { color: '#F0F0F0', fontSize: 13, fontWeight: '700' },
  statLabel: { color: 'rgba(156,163,175,0.8)', fontSize: 11 },
  statDivider: { width: 1, height: 14, backgroundColor: 'rgba(0,212,255,0.2)' },
  statsOpenText: { color: '#00d4ff', fontSize: 11, fontWeight: '700' },
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
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#00d4ff',
    borderRadius: 50, paddingVertical: 14, paddingHorizontal: 24,
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.5)',
    shadowColor: '#00d4ff', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  addButtonText: { color: '#fff', fontWeight: '600' },
  mainActions: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 10 },
  whereBeenButton: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(5,5,20,0.75)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.55)',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  whereBeenText: { color: '#FBBF24', fontSize: 13, fontWeight: '700' },
  shareButton: { backgroundColor: '#FBBF24', borderColor: '#FBBF24' },
  shareButtonText: { color: '#1C1300' },
  freeTripsIndicator: { color: '#F59E0B', fontSize: 11, fontWeight: '600', marginTop: 4 },
  freeTripsCentered: { textAlign: 'center', marginTop: -2 },
  logoPortrait: { fontSize: 22, letterSpacing: 1.5 },
  statValueGold: { color: '#FBBF24' },
  addColumn: { alignItems: 'center' },
  // Routes / Itineraries: amber pills with a written label (1.4.0)
  goldPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: 'rgba(245,158,11,0.15)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
    borderRadius: 999, height: 44, paddingHorizontal: 14,
    ...Platform.select({ android: { elevation: 12 } }),
  },
  goldPillOff: { backgroundColor: 'rgba(107,114,128,0.15)', borderColor: 'rgba(107,114,128,0.3)' },
  goldPillText: { color: '#F59E0B', fontSize: 13, fontWeight: '700' },
  goldPillTextOff: { color: '#9CA3AF' },
  // Portrait (1.4.0): globe on top, panel underneath
  globePortrait: { position: 'absolute', top: 0, left: 0, right: 0 },
  panel: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(8,10,24,0.97)', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderTopWidth: 1, borderColor: 'rgba(0,212,255,0.18)',
    ...Platform.select({ android: { elevation: 14 } }),
  },
  panelHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.18)', marginTop: 8 },
  panelContent: { paddingTop: 12, gap: 12 },
  panelRow: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  statsBarPortrait: {
    backgroundColor: 'rgba(5,5,20,0.7)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  statsRowPortrait: { justifyContent: 'space-between', gap: 6 },
  addButtonPortrait: { justifyContent: 'center', paddingVertical: 15 },
  welcomeRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.18)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
  },
  welcomeRowText: { flex: 1 },
});

export default App;
