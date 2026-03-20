/**
 * TravelSphere - EarthGlobe Component
 * Globo 3D futuristico: hex/wireframe holografico con animazioni attraenti
 * Fog of War: paesi visitati illuminati, non visitati spenti
 * Supercluster: clustering dinamico stile Google Maps
 * Flythrough: animazione camera attraverso itinerari
 */

import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';
import { EarthGlobeProps, Trip } from '../types';

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

function EarthGlobe({ trips, onPinClick, targetCoordinates, homeLocation, itineraries, showTravelLines, visitedCountries, flythroughStops }: EarthGlobeProps) {
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const pendingTrips = useRef<Trip[]>([]);
  const [globeHtml, setGlobeHtml] = useState<string | null>(globeHtmlCache);

  // Load HTML from asset on mount
  useEffect(() => {
    if (!globeHtml) {
      loadGlobeHtml().then((html) => {
        if (html) setGlobeHtml(html);
      });
    }
  }, [globeHtml]);

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
          isReady.current = true;
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
      } catch (e) {}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050510' },
  webview: { flex: 1, backgroundColor: '#050510' },
  loading: { justifyContent: 'center', alignItems: 'center' },
});

export default React.memo(EarthGlobe);
