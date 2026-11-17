import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator, Animated, Modal, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { worldPercentLabel } from '../utils/countries';
import CountryMap from './CountryMap';

const GOLD = '#FBBF24';
const INK = '#1C1300';

interface Props {
    visible: boolean;
    count: number;
    /** Distinct continents of the visited countries. */
    continents: number;
    /** ISO codes of every visited country: gold on the globe. */
    codes: readonly string[];
    hasTrips: boolean;
    sharing: boolean;
    onShare: () => void;
    onAddTrip: () => void;
    onClose: () => void;
}

/**
 * Full page shown right after "Where have you been?" is confirmed, in the
 * style of Statistics: the user's countries in gold on a big globe (the same
 * map as the share card), the numbers (countries, continents, % of the world)
 * and the two next steps. Closing it goes back to the 3D globe, lit in gold.
 * Landscape: globe on the left, numbers and buttons on the right.
 * Portrait: globe on top.
 */
const CountriesResultPanel: React.FC<Props> = ({
    visible, count, continents, codes, hasTrips, sharing, onShare, onAddTrip, onClose,
}) => {
    const { t } = useApp();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const landscape = width > height;
    const enter = useRef(new Animated.Value(0)).current;
    const pop = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (!visible) return;
        enter.setValue(0);
        pop.setValue(0.6);
        Animated.sequence([
            Animated.timing(enter, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(pop, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
        ]).start();
    }, [visible, enter, pop]);

    if (!visible) return null;

    const title = (t(count === 1 ? 'wbResultOne' : 'wbResultMany') as string).replace('{count}', String(count));
    const hiddenLabel = (n: number) =>
        (t(n === 1 ? 'cardMapHiddenOne' : 'cardMapHiddenMany') as string).split('{count}').join(String(n));
    const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] });

    const numbers = (
        <View style={styles.numbers}>
            <View style={styles.numItem}>
                <Animated.Text testID="wb-result-count" style={[styles.bigNum, { transform: [{ scale: pop }] }]}>{count}</Animated.Text>
                <Text style={styles.numLabel} numberOfLines={1}>{t(count === 1 ? 'cardCountryOne' : 'cardCountries') as string}</Text>
            </View>
            <View style={styles.numDivider} />
            <View style={styles.numItem}>
                <Text style={styles.bigNum}>{continents}</Text>
                <Text style={styles.numLabel} numberOfLines={1}>{t(continents === 1 ? 'cardContinentOne' : 'cardContinents') as string}</Text>
            </View>
            <View style={styles.numDivider} />
            <View style={styles.numItem}>
                <Text style={styles.bigNum}>{`${worldPercentLabel(count)}%`}</Text>
                <Text style={styles.numLabel} numberOfLines={1}>{t('cardWorldShort') as string}</Text>
            </View>
        </View>
    );

    const buttons = (
        <View style={styles.buttons}>
            <TouchableOpacity testID="wb-result-share" style={styles.primaryBtn} onPress={onShare} disabled={sharing} accessibilityRole="button">
                {sharing ? <ActivityIndicator color={INK} /> : <Ionicons name="share-social" size={18} color={INK} />}
                <Text style={styles.primaryText}>{t('shareGlobe') as string}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="wb-result-add" style={styles.secondaryBtn} onPress={onAddTrip} accessibilityRole="button">
                <Ionicons name="add" size={18} color="#E5E7EB" />
                <Text style={styles.secondaryText}>{t(hasTrips ? 'wbAddTrip' : 'wbAddFirstTrip') as string}</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose} supportedOrientations={['landscape', 'portrait']}>
            <View
                style={[styles.overlay, {
                    paddingTop: 12 + insets.top, paddingBottom: 12 + insets.bottom,
                    paddingLeft: 12 + insets.left, paddingRight: 12 + insets.right,
                }]}
            >
                <Animated.View testID="wb-result" style={[styles.page, { opacity: enter, transform: [{ scale }] }]}>
                    <View style={styles.header}>
                        <Ionicons name="earth" size={24} color={GOLD} />
                        <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{title}</Text>
                        <TouchableOpacity testID="wb-result-close" onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                            <Ionicons name="close" size={20} color="#9CA3AF" />
                            <Text style={styles.closeText}>{t('close') as string}</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.body, landscape ? styles.bodyRow : styles.bodyColumn]}>
                        <View style={[styles.mapBox, landscape ? styles.mapBoxRow : styles.mapBoxColumn]}>
                            <CountryMap gold={codes} hiddenFontSize={landscape ? 15 : 16} hiddenLabel={hiddenLabel} testID="wb-result-map" />
                        </View>
                        <View style={[styles.side, landscape && styles.sideRow]}>
                            {numbers}
                            {buttons}
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
    // Same family as Statistics (dark glass, rounded), with the gold "visited" accent.
    page: {
        // Opaque: the main screen must not show through the page.
        flex: 1, borderRadius: 24, padding: 18, backgroundColor: '#0C0C14',
        borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
    },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    title: { flex: 1, color: '#FFF7E0', fontSize: 20, fontWeight: '800' },
    closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6 },
    closeText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },
    body: { flex: 1, gap: 16 },
    bodyRow: { flexDirection: 'row', alignItems: 'stretch' },
    bodyColumn: { flexDirection: 'column' },
    mapBox: {},
    mapBoxRow: { flex: 1.15 },
    // Portrait: almost square, so the "other side" line sits right under the globe.
    mapBoxColumn: { width: '100%', aspectRatio: 0.9, flexShrink: 1 },
    side: { flex: 1, justifyContent: 'center', gap: 18 },
    sideRow: { flex: 1 },
    numbers: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    numItem: { alignItems: 'center', flexShrink: 1, paddingHorizontal: 4 },
    bigNum: { fontSize: 40, fontWeight: '900', color: GOLD },
    numLabel: { fontSize: 13, color: '#C7CDD6', marginTop: 2, fontWeight: '600' },
    numDivider: { width: 1, height: 44, backgroundColor: 'rgba(251,191,36,0.2)' },
    buttons: { gap: 10 },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13,
    },
    primaryText: { color: INK, fontSize: 16, fontWeight: '800' },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 14, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    secondaryText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
});

export default CountriesResultPanel;
