import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

const OfflineBanner: React.FC = () => {
    const { t } = useApp();
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener((state) => {
            setIsOffline(!state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    if (!isOffline) return null;

    return (
        <View style={styles.banner}>
            <Ionicons name="cloud-offline-outline" size={16} color="#F59E0B" />
            <Text style={styles.text}>{t('offlineTitle')}</Text>
            <Text style={styles.subtext}>{t('offlineText')}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        position: 'absolute',
        top: 70,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        zIndex: 20,
        ...Platform.select({ android: { elevation: 20 } }),
    },
    text: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
    subtext: { color: '#9CA3AF', fontSize: 11, flex: 1 },
});

export default OfflineBanner;
