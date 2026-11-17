import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { TravelStats } from '../utils/travelStats';
import { YearRecap } from '../utils/yearRecap';
import { useShareGlobe } from '../hooks/useShareGlobe';
import ShareCard from './ShareCard';
import ShareCardCapture from './ShareCardCapture';

const GOLD = '#FBBF24';
const INK = '#1C1300';

interface Props {
    visible: boolean;
    stats: TravelStats;
    onClose: () => void;
    /** utm_campaign of the QR link; "card" unless said otherwise (year recap). */
    campaign?: string;
    /** Year recap: the same sheet shows the "My {year} in travel" card. */
    recap?: YearRecap | null;
    /** ISO codes of every visited country: gold on the card map. */
    visitedCodes?: readonly string[];
}

/**
 * "Share your globe" from the main screen and from the result panel: a live
 * preview of the card, the optional name (same setting as in Statistics) and
 * the share button. The PNG comes from ShareCard (pure RN), never the globe.
 */
const ShareGlobeSheet: React.FC<Props> = ({ visible, stats, onClose, campaign = 'card', recap = null, visitedCodes = [] }) => {
    const { t, settings, updateSettings } = useApp();
    const { width, height } = useWindowDimensions();
    const landscape = width > height;
    const { captureHostRef, sharing, share } = useShareGlobe();
    const [name, setName] = useState(settings.travelerName ?? '');
    const trimmedName = name.trim();
    const shareLabel = recap
        ? (t('recapShareTitle') as string).split('{year}').join(String(recap.year))
        : (t('shareGlobe') as string);

    useEffect(() => {
        if (visible) setName(settings.travelerName ?? '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const persistName = () => {
        if (trimmedName !== (settings.travelerName ?? '')) updateSettings({ travelerName: trimmedName });
    };

    // Preview size: as big as fits next to (landscape) or above (portrait) the controls.
    const previewWidth = landscape
        ? Math.round(Math.min((height - 56) * (9 / 16), width * 0.4))
        : Math.round(Math.min(width * 0.62, height * 0.5 * (9 / 16)));

    const controls = (
        <View style={[styles.controls, landscape && styles.controlsSide]}>
            <Text style={styles.title}>{shareLabel}</Text>
            <TextInput
                testID="share-name"
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                onEndEditing={persistName}
                onBlur={persistName}
                placeholder={t('travelerNamePlaceholder') as string}
                placeholderTextColor="#6B7280"
                maxLength={24}
                returnKeyType="done"
                autoCapitalize="words"
                disableFullscreenUI
            />
            <TouchableOpacity
                testID="share-confirm"
                style={[styles.primaryBtn, sharing && styles.btnBusy]}
                onPress={() => share(persistName)}
                disabled={sharing}
                accessibilityRole="button"
            >
                {sharing ? <ActivityIndicator color={INK} /> : <Ionicons name="share-social" size={18} color={INK} />}
                <Text style={styles.primaryText}>{shareLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="share-close" style={styles.secondaryBtn} onPress={() => { persistName(); onClose(); }} accessibilityRole="button">
                <Text style={styles.secondaryText}>{t('close') as string}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <SafeAreaProvider>
                <SafeAreaView style={styles.overlay} edges={['top', 'bottom', 'left', 'right']} testID="share-sheet">
                    <View style={[styles.body, landscape && styles.bodyLandscape]}>
                        <View style={styles.preview}>
                            <ShareCard stats={stats} travelerName={trimmedName} width={previewWidth} campaign={campaign} recap={recap} visitedCodes={visitedCodes} />
                        </View>
                        {controls}
                    </View>
                    {/* Off-screen full-size card used for the PNG */}
                    {visible && (
                        <ShareCardCapture ref={captureHostRef} stats={stats} travelerName={trimmedName} campaign={campaign} recap={recap} visitedCodes={visitedCodes} />
                    )}
                </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(3,3,10,0.92)' },
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, gap: 16 },
    bodyLandscape: { flexDirection: 'row', gap: 28 },
    preview: {
        borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
    },
    controls: { width: '100%', maxWidth: 380, gap: 10 },
    controlsSide: { width: 300 },
    title: { color: '#FFF7E0', fontSize: 20, fontWeight: '800', marginBottom: 2 },
    nameInput: {
        backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 9,
        color: '#fff', fontSize: 15,
    },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13,
    },
    btnBusy: { opacity: 0.7 },
    primaryText: { color: INK, fontSize: 16, fontWeight: '800' },
    secondaryBtn: {
        alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 11,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    secondaryText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
});

export default ShareGlobeSheet;
