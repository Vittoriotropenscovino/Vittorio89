import React, { useEffect, useRef } from 'react';
import {
    ActivityIndicator, Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { worldPercentLabel } from '../utils/countries';

const GOLD = '#FBBF24';
const INK = '#1C1300';

interface Props {
    visible: boolean;
    count: number;
    hasTrips: boolean;
    sharing: boolean;
    onShare: () => void;
    onAddTrip: () => void;
    onClose: () => void;
}

/**
 * Shown on the globe right after "Where have you been?" is confirmed: how many
 * countries, what share of the world, and the two next steps.
 */
const CountriesResultPanel: React.FC<Props> = ({ visible, count, hasTrips, sharing, onShare, onAddTrip, onClose }) => {
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
    const pct = (t('wbResultPct') as string).replace('{pct}', worldPercentLabel(count));
    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

    return (
        <Animated.View
            testID="wb-result"
            pointerEvents="box-none"
            style={[
                styles.host,
                // Landscape: in the left column, between the title and the "Where have you
                // been?" button, so it never covers the globe (which keeps turning).
                landscape
                    ? { left: 20 + insets.left, bottom: 112 + insets.bottom, width: Math.min(280, Math.round(width * 0.29)) }
                    // Portrait: also above the "Where have you been?" button (bottom-left).
                    : { left: 16 + insets.left, right: 16 + insets.right, bottom: 116 + insets.bottom },
                { opacity: enter, transform: [{ translateY }] },
            ]}
        >
            <View style={[styles.card, landscape && styles.cardCompact]}>
                <View style={styles.topRow}>
                    <Animated.Text style={[styles.bigNumber, landscape && styles.bigNumberCompact, { transform: [{ scale: pop }] }]}>{count}</Animated.Text>
                    <View style={styles.titles}>
                        <Text style={[styles.title, landscape && styles.titleCompact]}>{title}</Text>
                        <Text style={styles.pct}>{pct}</Text>
                    </View>
                    <TouchableOpacity testID="wb-result-close" onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                        <Text style={styles.closeText}>{t('close') as string}</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity testID="wb-result-share" style={[styles.primaryBtn, landscape && styles.btnCompact]} onPress={onShare} disabled={sharing} accessibilityRole="button">
                    {sharing ? <ActivityIndicator color={INK} /> : <Ionicons name="share-social" size={18} color={INK} />}
                    <Text style={[styles.primaryText, landscape && styles.btnTextCompact]}>{t('shareGlobe') as string}</Text>
                </TouchableOpacity>
                <TouchableOpacity testID="wb-result-add" style={[styles.secondaryBtn, landscape && styles.btnCompact]} onPress={onAddTrip} accessibilityRole="button">
                    <Ionicons name="add" size={18} color="#E5E7EB" />
                    <Text style={[styles.secondaryText, landscape && styles.btnTextCompact]}>{t(hasTrips ? 'wbAddTrip' : 'wbAddFirstTrip') as string}</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    host: { position: 'absolute', zIndex: 30, elevation: 30 },
    card: {
        backgroundColor: 'rgba(10,10,22,0.94)', borderRadius: 20, padding: 16, gap: 10,
        borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)',
    },
    topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    bigNumber: { color: GOLD, fontSize: 44, fontWeight: '900', minWidth: 44, textAlign: 'center' },
    titles: { flex: 1 },
    title: { color: '#FFF7E0', fontSize: 17, fontWeight: '800' },
    pct: { color: GOLD, fontSize: 14, fontWeight: '700', marginTop: 2 },
    closeBtn: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4 },
    closeText: { color: '#9CA3AF', fontSize: 13, fontWeight: '600' },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: GOLD, borderRadius: 14, paddingVertical: 12,
    },
    primaryText: { color: INK, fontSize: 16, fontWeight: '800' },
    secondaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        borderRadius: 14, paddingVertical: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    secondaryText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
    // Landscape phones have little height: same card, tighter.
    cardCompact: { padding: 12, gap: 8 },
    bigNumberCompact: { fontSize: 34, minWidth: 34 },
    titleCompact: { fontSize: 15 },
    btnCompact: { paddingVertical: 9 },
    btnTextCompact: { fontSize: 14 },
});

export default CountriesResultPanel;
