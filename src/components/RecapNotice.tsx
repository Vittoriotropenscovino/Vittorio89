import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { YearRecap } from '../utils/yearRecap';

const GOLD = '#FBBF24';
const INK = '#1C1300';

interface Props {
    recap: YearRecap;
    /** Trips in the year → open the recap card; none → add a trip (free-limit rules apply). */
    onOpen: () => void;
    onAddTrip: () => void;
    /** Closes the notice for this year only. */
    onDismiss: () => void;
}

/**
 * Main-screen notice for the year recap, from 1 December to 31 January.
 * Top centre, just under the header row (logo on the left, buttons on the
 * right), so it never covers them. Every button has a written label.
 */
const RecapNotice: React.FC<Props> = ({ recap, onOpen, onAddTrip, onDismiss }) => {
    const { t } = useApp();
    const insets = useSafeAreaInsets();
    const { width, height } = useWindowDimensions();
    const landscape = width > height;
    const appear = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(appear, { toValue: 1, useNativeDriver: true, friction: 7, tension: 60 }).start();
    }, [appear]);

    const hasTrips = recap.trips > 0;
    const year = String(recap.year);
    const message = (t(hasTrips ? 'recapNoticeReady' : 'recapNoticeEmpty') as string).split('{year}').join(year);
    const maxWidth = Math.min(landscape ? 330 : 420, width - insets.left - insets.right - 32);

    return (
        <View
            pointerEvents="box-none"
            style={[styles.host, { top: (landscape ? 84 : 96) + insets.top, left: insets.left, right: insets.right }]}
        >
            <Animated.View
                testID="recap-notice"
                style={[
                    styles.card,
                    { maxWidth, opacity: appear, transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }] },
                ]}
            >
                <View style={styles.row}>
                    <Ionicons name="sparkles" size={18} color={GOLD} />
                    <Text style={styles.text} numberOfLines={2}>{message}</Text>
                </View>
                <View style={styles.buttons}>
                    <TouchableOpacity
                        testID={hasTrips ? 'recap-open' : 'recap-add'}
                        style={styles.primary}
                        onPress={hasTrips ? onOpen : onAddTrip}
                        accessibilityRole="button"
                    >
                        <Ionicons name={hasTrips ? 'share-social' : 'add'} size={15} color={INK} />
                        <Text style={styles.primaryText} numberOfLines={1}>
                            {t(hasTrips ? 'recapNoticeOpen' : 'wbAddTrip') as string}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity testID="recap-dismiss" style={styles.secondary} onPress={onDismiss} accessibilityRole="button">
                        <Text style={styles.secondaryText} numberOfLines={1}>{t('close') as string}</Text>
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    host: { position: 'absolute', alignItems: 'center', zIndex: 20, elevation: 20 },
    card: {
        backgroundColor: 'rgba(5,5,20,0.88)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.6)',
        borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
        ...Platform.select({ android: { elevation: 14 } }),
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    text: { color: '#FFF7E0', fontSize: 14, fontWeight: '700', flexShrink: 1 },
    buttons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    primary: {
        flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: GOLD,
        borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, flexShrink: 1,
    },
    primaryText: { color: INK, fontSize: 13, fontWeight: '800' },
    secondary: {
        borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    secondaryText: { color: '#E5E7EB', fontSize: 13, fontWeight: '600' },
});

export default RecapNotice;
