import React, { useEffect, useRef, useState } from 'react';
import { Image, Modal, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import ShareCard from './ShareCard';
import ShareCardCapture, { ShareCardCaptureHandle } from './ShareCardCapture';
import { CountryMapStyle } from './CountryMap';
import { TravelStats } from '../utils/travelStats';
import { YearRecap, recapCampaign } from '../utils/yearRecap';
import { worldPercentLabel } from '../utils/countries';
import { useApp } from '../contexts/AppContext';

// ONLY in the emulator test build (EXPO_PUBLIC_ROTAZIONE_LIBERA=1): shows the
// share card full width with sample numbers, to take the checkpoint PNGs.
// A tap moves to the next sample. Never reachable in store or phone builds.
//   - "Mappa" switches flat world map / globe;
//   - "Cattura" runs the REAL capture (ShareCardCapture, 1080×1920), times it,
//     shows the captured PNG instead of the live card and keeps a copy in the
//     app cache (card-prova-<style>-<lang>-<n>-<ms>ms.png) for the checks.
export interface CardSample {
    label: string;
    stats: TravelStats;
    codes: string[];
    travelerName?: string;
    campaign?: string;
    recap?: YearRecap;
}

const sampleRecap = (r: Omit<YearRecap, 'totalPct'>): YearRecap => ({ ...r, totalPct: worldPercentLabel(r.totalCountries) });

// 23 countries, 5 continents: Europe (incl. Malta, a dot), Africa, Asia, the Americas.
const MANY = ['IT', 'FR', 'ES', 'DE', 'GR', 'PT', 'GB', 'NL', 'CH', 'AT', 'HR', 'MT', 'MA', 'EG', 'TN', 'JP', 'TH', 'VN', 'AE', 'US', 'MX', 'CU', 'BR'];
const MARKED = ['IT', 'FR', 'ES', 'DE', 'GR', 'PT', 'GB', 'NL', 'CH', 'US', 'MX', 'JP'];

export const CARD_SAMPLES: CardSample[] = [
    { label: '1 viaggio', stats: { countries: 1, continents: 1, trips: 1 }, codes: ['IT'], travelerName: 'Vittorio' },
    { label: 'molti viaggi', stats: { countries: 23, continents: 5, trips: 47 }, codes: MANY, travelerName: 'Vittorio' },
    {
        label: 'riepilogo: molti viaggi, 3 paesi nuovi',
        stats: { countries: 23, continents: 5, trips: 47 },
        codes: MANY,
        travelerName: 'Vittorio',
        campaign: recapCampaign(2026),
        recap: sampleRecap({ year: 2026, trips: 9, countries: 5, newCountries: 3, continents: 2, totalCountries: 23, codes: ['JP', 'TH', 'VN', 'IT', 'FR'], allCodes: MANY }),
    },
    { label: '0 viaggi (solo paesi segnati)', stats: { countries: 12, continents: 3, trips: 0 }, codes: MARKED },
    {
        label: 'riepilogo: 1 viaggio, 1 paese nuovo',
        stats: { countries: 4, continents: 1, trips: 5 },
        codes: ['IT', 'FR', 'ES', 'PT'],
        campaign: recapCampaign(2026),
        recap: sampleRecap({ year: 2026, trips: 1, countries: 1, newCountries: 1, continents: 1, totalCountries: 4, codes: ['PT'], allCodes: ['IT', 'FR', 'ES', 'PT'] }),
    },
    {
        label: 'riepilogo: nessun paese nuovo',
        stats: { countries: 8, continents: 2, trips: 14 },
        codes: ['IT', 'FR', 'ES', 'DE', 'GR', 'PT', 'GB', 'EG'],
        travelerName: 'Vittorio',
        campaign: recapCampaign(2026),
        recap: sampleRecap({ year: 2026, trips: 2, countries: 1, newCountries: 0, continents: 1, totalCountries: 8, codes: ['IT'], allCodes: ['IT', 'FR', 'ES', 'DE', 'GR', 'PT', 'GB', 'EG'] }),
    },
];

const CardPreviewDev: React.FC<{ visible: boolean; onClose: () => void; samples?: CardSample[] }> = ({
    visible, onClose, samples = CARD_SAMPLES,
}) => {
    const { language } = useApp();
    const { width, height } = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const [mapStyle, setMapStyle] = useState<CountryMapStyle>('globe');
    // Capture test: the host is mounted only while capturing, like the share sheet.
    const [capturing, setCapturing] = useState(false);
    const [captured, setCaptured] = useState<{ uri: string; ms: number; ms2: number; size: string } | null>(null);
    const hostRef = useRef<ShareCardCaptureHandle>(null);
    const startedAt = useRef(0);
    const n = index % samples.length;
    const sample = samples[n];
    const cardWidth = Math.min(width, Math.floor(height * (9 / 16)));

    useEffect(() => {
        if (!capturing) return;
        let alive = true;
        (async () => {
            try {
                // 1st capture: card drawn from scratch (map included) + snapshot.
                await hostRef.current!.capture();
                const ms = Date.now() - startedAt.current;
                // 2nd capture: card already on screen, like pressing "Share" in the sheet.
                const t2 = Date.now();
                const uri = await hostRef.current!.capture();
                const ms2 = Date.now() - t2;
                const size = await new Promise<string>((resolve) =>
                    Image.getSize(uri, (w, h) => resolve(`${w}×${h}`), () => resolve('?')));
                const copy = `${FileSystem.cacheDirectory}card-prova-${mapStyle}-${language}-${n + 1}-${ms}ms-${ms2}ms.png`;
                await FileSystem.copyAsync({ from: uri, to: copy });
                console.log(`[card-prova] ${mapStyle} ${language} ${n + 1} ${ms}ms ${ms2}ms ${size} ${copy}`);
                if (alive) setCaptured({ uri: copy, ms, ms2, size });
            } catch (e) {
                console.log('[card-prova] errore', e);
                if (alive) setCaptured({ uri: '', ms: -1, ms2: -1, size: String(e) });
            } finally {
                if (alive) setCapturing(false);
            }
        })();
        return () => { alive = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [capturing]);

    const startCapture = () => {
        if (capturing) return;
        setCaptured(null);
        startedAt.current = Date.now();
        setCapturing(true);
    };

    return (
        <Modal visible={visible} statusBarTranslucent onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <StatusBar hidden />
            <Pressable testID="card-dev" style={styles.root} onPress={() => { setCaptured(null); setIndex((i) => i + 1); }} onLongPress={onClose}>
                {captured?.uri ? (
                    <Image testID="card-dev-captured" source={{ uri: captured.uri }} style={{ width: cardWidth, height: Math.round(cardWidth * (16 / 9)) }} />
                ) : (
                    <ShareCard stats={sample.stats} travelerName={sample.travelerName} width={cardWidth} campaign={sample.campaign} recap={sample.recap} visitedCodes={sample.codes} mapStyle={mapStyle} />
                )}
                <View style={styles.info}>
                    <Text style={styles.infoText} testID="card-dev-label">{`${n + 1}/${samples.length} · ${sample.label} · ${mapStyle === 'globe' ? 'globo' : 'planisfero'}`}</Text>
                    {captured ? (
                        <Text style={styles.infoText} testID="card-dev-result">{`disegno+cattura ${captured.ms} ms · solo cattura ${captured.ms2} ms · ${captured.size}`}</Text>
                    ) : null}
                    <View style={styles.buttons}>
                        <Pressable testID="card-dev-style" style={styles.button} onPress={() => { setCaptured(null); setMapStyle((s) => (s === 'globe' ? 'flat' : 'globe')); }}>
                            <Text style={styles.buttonText}>Mappa</Text>
                        </Pressable>
                        <Pressable testID="card-dev-capture" style={styles.button} onPress={startCapture}>
                            <Text style={styles.buttonText}>{capturing ? 'Cattura…' : 'Cattura'}</Text>
                        </Pressable>
                    </View>
                </View>
            </Pressable>
            {capturing ? (
                <ShareCardCapture
                    ref={hostRef}
                    stats={sample.stats}
                    travelerName={sample.travelerName}
                    campaign={sample.campaign}
                    recap={sample.recap}
                    visitedCodes={sample.codes}
                    mapStyle={mapStyle}
                />
            ) : null}
        </Modal>
    );
};

const styles = StyleSheet.create({
    // 48 dp below the top: clear of the status bar, so the screenshot crop is clean.
    root: { flex: 1, backgroundColor: '#000', alignItems: 'flex-start', paddingTop: 48 },
    info: { padding: 12, gap: 6 },
    infoText: { color: '#9CA3AF', fontSize: 14 },
    buttons: { flexDirection: 'row', gap: 10 },
    button: { backgroundColor: '#1F2937', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14 },
    buttonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});

export default CardPreviewDev;
