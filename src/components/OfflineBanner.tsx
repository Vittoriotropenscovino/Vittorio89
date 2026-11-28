import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../contexts/AppContext';
import { useOrientation } from '../hooks/useOrientation';

// 1.4.0 block L: the banner sits under the title, whose height is measured by App
// (the old fixed distance of 70 covered it, in landscape too, and more with a big system
// font). In portrait the two texts go one under the other, so a big font does not
// squeeze the explanation into a narrow column.
interface Props {
    /** distance from the top of the screen: App passes the bottom of the title */
    top?: number;
}

const OfflineBanner: React.FC<Props> = ({ top }) => {
    const { t } = useApp();
    const { isPortrait } = useOrientation();
    const insets = useSafeAreaInsets();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOffline(!state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    if (!isOffline) return null;

    const place = isPortrait
        ? { top: top ?? insets.top + 84, left: 16 + insets.left, right: 16 + insets.right }
        : { top: top ?? insets.top + 90, left: 20 + insets.left, right: 20 + insets.right };

    return (
        <View testID="offline-banner" style={[styles.banner, place]}>
            <Ionicons name="cloud-offline-outline" size={16} color="#F59E0B" />
            {isPortrait ? (
                <View style={styles.column}>
                    <Text style={styles.text}>{t('offlineTitle')}</Text>
                    <Text style={styles.subtextPortrait}>{t('offlineText')}</Text>
                </View>
            ) : (
                <>
                    <Text style={styles.text}>{t('offlineTitle')}</Text>
                    <Text style={styles.subtext}>{t('offlineText')}</Text>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        // nearly opaque: the globe's lines no longer run through the text (1.4.0 block L)
        backgroundColor: 'rgba(38, 27, 6, 0.94)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        zIndex: 20,
        ...Platform.select({ android: { elevation: 20 } }),
    },
    column: { flex: 1, gap: 2 },
    text: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
    subtext: { color: '#9CA3AF', fontSize: 11, flex: 1 },
    subtextPortrait: { color: '#9CA3AF', fontSize: 11 },
});

export default OfflineBanner;
