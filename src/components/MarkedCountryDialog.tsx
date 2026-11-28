import React, { useEffect, useRef } from 'react';
import { Animated, Modal, PixelRatio, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { isoToFlag } from '../utils/countryFlags';
import { MODAL_BACKDROP } from '../utils/surfaces';
import { ALL_ORIENTATIONS, useOrientation } from '../hooks/useOrientation';
import { markedButtonsStacked, markedCardWidth } from '../utils/dialogButtons';

const GOLD = '#FBBF24';
const INK = '#1C1300';

interface Props {
    /** The tapped country (marked from the list), or null when closed. */
    country: { code: string; name: string } | null;
    onAddTrip: (country: { code: string; name: string }) => void;
    onClose: () => void;
}

/**
 * Tap on a country marked from "Where have you been?" (not from a trip):
 * "Add a trip here", in the app's own style (dark glass, gold accent) instead
 * of the system alert. Tapping outside or "Cancel" closes it.
 */
const MarkedCountryDialog: React.FC<Props> = ({ country, onAddTrip, onClose }) => {
    const { t } = useApp();
    const enter = useRef(new Animated.Value(0)).current;
    const { width: winW } = useOrientation();
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (!country) return;
        enter.setValue(0);
        Animated.spring(enter, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }).start();
    }, [country, enter]);

    if (!country) return null;
    // 1.4.0 block L: when "Add a trip here" does not fit next to "Cancel" (portrait
    // phones, big system font) the buttons go one under the other, main one on top.
    const addLabel = t('wbAddTripHere') as string;
    const cardW = markedCardWidth(winW, insets.left + insets.right);
    const stacked = markedButtonsStacked(addLabel, cardW, PixelRatio.getFontScale());

    const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] });

    return (
        <Modal visible transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose} supportedOrientations={ALL_ORIENTATIONS}>
            <Pressable style={styles.overlay} onPress={onClose} testID="marked-country-overlay">
                {/* Inner Pressable: a tap on the card itself does not close it */}
                <Pressable onPress={() => {}}>
                    <Animated.View testID="marked-country-dialog" style={[styles.card, { width: cardW, opacity: enter, transform: [{ scale }] }]}>
                        <View style={styles.titleRow}>
                            <Text style={styles.flag}>{isoToFlag(country.code)}</Text>
                            <Text style={styles.title} numberOfLines={2}>{country.name}</Text>
                        </View>
                        <Text style={styles.message}>{t('wbMarkedCountryMsg') as string}</Text>
                        <View style={[styles.buttons, stacked && styles.buttonsStacked]}>
                            <TouchableOpacity testID="marked-country-cancel" style={[styles.secondaryBtn, stacked && styles.btnStacked]} onPress={onClose} accessibilityRole="button">
                                <Text style={styles.secondaryText}>{t('cancel') as string}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity testID="marked-country-add" style={[styles.primaryBtn, stacked && styles.btnStacked]} onPress={() => onAddTrip(country)} accessibilityRole="button">
                                <Ionicons name="add" size={18} color={INK} />
                                <Text style={styles.primaryText} numberOfLines={stacked ? 2 : 1}>{addLabel}</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </Pressable>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: MODAL_BACKDROP, justifyContent: 'center', alignItems: 'center', padding: 24 },
    card: {
        maxWidth: '100%', borderRadius: 22, padding: 20, gap: 14,
        backgroundColor: '#0C0C14', borderWidth: 1, borderColor: 'rgba(251,191,36,0.45)',
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    flag: { fontSize: 30 },
    title: { flex: 1, color: '#FFF7E0', fontSize: 20, fontWeight: '800' },
    message: { color: '#C7CDD6', fontSize: 15, lineHeight: 21 },
    buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
    // main button on top, "Cancel" under it
    buttonsStacked: { flexDirection: 'column-reverse' },
    btnStacked: { flex: 0, minHeight: 48 },
    secondaryBtn: {
        flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    secondaryText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
    primaryBtn: {
        flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: GOLD, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10,
    },
    primaryText: { color: INK, fontSize: 15, fontWeight: '800', flexShrink: 1 },
});

export default MarkedCountryDialog;
