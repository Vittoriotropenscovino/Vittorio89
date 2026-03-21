/**
 * TravelSphere - EarthGlobe Component
 * Globo 3D futuristico: hex/wireframe holografico con animazioni attraenti
 * Fog of War: paesi visitati illuminati, non visitati spenti
 * Supercluster: clustering dinamico stile Google Maps
 * Flythrough: animazione camera attraverso itinerari
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { EarthGlobeProps, Trip } from '../types';
import { useApp } from '../contexts/AppContext';

// Globe HTML and vendor libraries loaded from asset files
// eslint-disable-next-line @typescript-eslint/no-var-requires
const globeHtmlModule = require('../../assets/globe.html');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const topojsonModule = require('../../assets/vendor/topojson-client.min.txt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const globeGlModule = require('../../assets/vendor/globe.gl.min.txt');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const countriesModule = require('../../assets/vendor/countries-110m.txt');

let globeHtmlCache: string | null = null;

async function loadAssetString(module: number): Promise<string> {
  try {
    const asset = Asset.fromModule(module);
    await asset.downloadAsync();
    if (asset.localUri) {
      return await FileSystem.readAsStringAsync(asset.localUri);
    }
  } catch (e) {
    console.warn('Failed to load asset:', e);
  }
  return '';
}

async function loadGlobeHtml(): Promise<string> {
  if (globeHtmlCache) return globeHtmlCache;
  try {
    const html = await loadAssetString(globeHtmlModule);
    if (!html) return '';

    // Load vendor scripts in parallel
    const [topojsonJs, globeGlJs, countriesJson] = await Promise.all([
      loadAssetString(topojsonModule),
      loadAssetString(globeGlModule),
      loadAssetString(countriesModule),
    ]);

    // Build inline vendor script block
    let vendorBlock = '';
    if (topojsonJs) {
      vendorBlock += `<script>${topojsonJs}</script>\n`;
    }
    if (globeGlJs) {
      vendorBlock += `<script>${globeGlJs}</script>\n`;
    }
    if (countriesJson) {
      vendorBlock += `<script>window.__COUNTRIES_DATA=${countriesJson};</script>\n`;
    }

    // Inject vendor scripts before the main script in the HTML
    // Insert right after the placeholder comment, or before the first <script> tag
    let injectedHtml = html;
    if (vendorBlock) {
      const placeholder = '// <!--VENDOR_SCRIPTS_PLACEHOLDER-->';
      const placeholderIdx = html.indexOf(placeholder);
      if (placeholderIdx !== -1) {
        // Find the <script> tag containing the placeholder and insert vendor scripts before it
        const scriptOpenIdx = html.lastIndexOf('<script>', placeholderIdx);
        if (scriptOpenIdx !== -1) {
          injectedHtml = html.slice(0, scriptOpenIdx) + vendorBlock + html.slice(scriptOpenIdx);
        }
      }
    }

    globeHtmlCache = injectedHtml;
    return injectedHtml;
  } catch (e) {
    console.error('Failed to load globe HTML asset:', e);
  }
  return '';
}

// CDN origins kept for fallback if local vendor files fail to load
const ORIGIN_WHITELIST = ['https://unpkg.com', 'https://cdn.jsdelivr.net', 'about:*'];

const READY_TIMEOUT_MS = 15000;

function EarthGlobe({ trips, onPinClick, targetCoordinates, homeLocation, itineraries, showTravelLines, visitedCountries, flythroughStops }: EarthGlobeProps) {
  const { t } = useApp();
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const pendingTrips = useRef<Trip[]>([]);
  const [globeHtml, setGlobeHtml] = useState<string | null>(globeHtmlCache);
  const [globeReady, setGlobeReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const readyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load HTML from asset on mount
  useEffect(() => {
    if (!globeHtml) {
      loadGlobeHtml().then((html) => {
        if (html) setGlobeHtml(html);
      });
    }
  }, [globeHtml]);

  // Timeout: if WebView doesn't send "ready" within 15s, show error
  useEffect(() => {
    readyTimeoutRef.current = setTimeout(() => {
      if (!isReady.current) {
        setLoadError(true);
        console.error('[TravelSphere] Globe WebView failed to load within 15s');
      }
    }, READY_TIMEOUT_MS);
    return () => {
      if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    };
  }, []);

  const retryLoad = useCallback(() => {
    setLoadError(false);
    setGlobeReady(false);
    isReady.current = false;
    webViewRef.current?.reload();
    if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
    readyTimeoutRef.current = setTimeout(() => {
      if (!isReady.current) {
        setLoadError(true);
        console.error('[TravelSphere] Globe WebView failed to load within 15s');
      }
    }, READY_TIMEOUT_MS);
  }, []);

  const webViewSource = useMemo(() => {
    if (!globeHtml) return null;
    return { html: globeHtml, baseUrl: 'https://unpkg.com' };
  }, [globeHtml]);

  const sendToWebView = useCallback((data: Record<string, unknown>) => {
    if (!webViewRef.current) return;
    const json = JSON.stringify(data);
    webViewRef.current.injectJavaScript(
      `try{handleMessageFromRN(${JSON.stringify(json)});}catch(e){}true;`
    );
  }, []);

  const tripData = useCallback((t: Trip[]) => t.map((tr) => ({
    id: tr.id, title: tr.title, latitude: tr.latitude,
    longitude: tr.longitude, createdAt: tr.createdAt,
    itineraryId: tr.itineraryId,
    showArc: tr.showArc || false,
    isWishlist: tr.isWishlist || false,
  })), []);

  useEffect(() => {
    const td = tripData(trips);
    const itinData = (itineraries || []).map((it) => ({
      id: it.id, name: it.name, tripIds: it.tripIds,
    }));
    if (isReady.current) {
      sendToWebView({ type: 'updateTrips', trips: td, itineraries: itinData });
    } else {
      pendingTrips.current = trips;
    }
  }, [trips, itineraries, sendToWebView, tripData]);

  useEffect(() => {
    if (isReady.current) {
      sendToWebView({ type: 'updateHome', home: homeLocation || null });
    }
  }, [homeLocation, sendToWebView]);

  useEffect(() => {
    if (isReady.current) {
      sendToWebView({ type: 'updateTravelLines', show: showTravelLines !== false });
    }
  }, [showTravelLines, sendToWebView]);

  // Fog of War - update visited countries
  useEffect(() => {
    if (isReady.current && visitedCountries) {
      sendToWebView({ type: 'updateVisitedCountries', countries: visitedCountries });
    }
  }, [visitedCountries, sendToWebView]);

  useEffect(() => {
    if (targetCoordinates && isReady.current) {
      sendToWebView({ type: 'flyTo', lat: targetCoordinates.latitude, lng: targetCoordinates.longitude });
    }
  }, [targetCoordinates, sendToWebView]);

  // Flythrough animation
  useEffect(() => {
    if (flythroughStops && flythroughStops.length >= 2 && isReady.current) {
      sendToWebView({ type: 'flythrough', stops: flythroughStops });
    }
  }, [flythroughStops, sendToWebView]);

  const handleMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'ready') {
          if (readyTimeoutRef.current) clearTimeout(readyTimeoutRef.current);
          isReady.current = true;
          setGlobeReady(true);
          setLoadError(false);
          const src = pendingTrips.current.length > 0 ? pendingTrips.current : trips;
          const itinData = (itineraries || []).map((it) => ({
            id: it.id, name: it.name, tripIds: it.tripIds,
          }));
          sendToWebView({ type: 'updateTrips', trips: tripData(src), itineraries: itinData });
          if (homeLocation) {
            sendToWebView({ type: 'updateHome', home: homeLocation });
          }
          sendToWebView({ type: 'updateTravelLines', show: showTravelLines !== false });
          if (visitedCountries) {
            sendToWebView({ type: 'updateVisitedCountries', countries: visitedCountries });
          }
          pendingTrips.current = [];
        } else if (data.type === 'pinClick') {
          const trip = trips.find((t) => t.id === data.tripId);
          if (trip) onPinClick(trip);
        }
      } catch (e) {
        console.warn('[TravelSphere] WebView message parse error:', e);
      }
    },
    [trips, itineraries, onPinClick, sendToWebView, homeLocation, showTravelLines, visitedCountries, tripData]
  );

  useEffect(() => {
    return () => {
      if (webViewRef.current) {
        try {
          webViewRef.current.injectJavaScript(
            `try{handleMessageFromRN('{"type":"cleanup"}')}catch(e){}true;`
          );
        } catch (e) {}
      }
    };
  }, []);

  // Show loading while HTML asset is being loaded
  if (!webViewSource) {
    return (
      <View style={[styles.container, styles.loading]}>
        <ActivityIndicator size="large" color="#60A5FA" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={webViewSource}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={ORIGIN_WHITELIST}
        mixedContentMode="never"
        allowFileAccess={false}
        allowUniversalAccessFromFileURLs={false}
        scrollEnabled={false}
        overScrollMode="never"
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        nestedScrollEnabled={false}
      />
      {loadError && (
        <View style={styles.globeError}>
          <Ionicons name="globe-outline" size={48} color="#6B7280" />
          <Text style={styles.errorTitle}>{t('globeLoadError')}</Text>
          <Text style={styles.errorSubtitle}>{t('globeLoadErrorHint')}</Text>
          <TouchableOpacity onPress={retryLoad} style={styles.retryButton}>
            <Ionicons name="refresh" size={18} color="#fff" />
            <Text style={styles.retryText}>{t('retry')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  webview: { flex: 1, backgroundColor: '#050510' },
  loading: { justifyContent: 'center', alignItems: 'center' },
  globeError: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5,5,16,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  errorTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  errorSubtitle: { color: '#6B7280', fontSize: 13, textAlign: 'center' },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 8,
  },
  retryText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default React.memo(EarthGlobe);
