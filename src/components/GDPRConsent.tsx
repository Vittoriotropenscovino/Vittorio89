import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { ALL_ORIENTATIONS, useOrientation } from '../hooks/useOrientation';
import { MODAL_BACKDROP, MODAL_CARD } from '../utils/surfaces';

interface GDPRConsentProps {
    visible: boolean;
    onAccept: () => void;
    onShowPrivacy: () => void;
}

// 1.4.0 block J: the window stays inside the safe area (92% wide in portrait).
// The text scrolls, "Continue" and "Learn more" stay fixed at the bottom: in
// landscape with the system font at 130% the old window went past the screen
// and the button could not be reached.
const GDPRConsent: React.FC<GDPRConsentProps> = ({ visible, onAccept, onShowPrivacy }) => {
    const { t } = useApp();
    const { height: winH, isPortrait, isLandscape } = useOrientation();
    const insets = useSafeAreaInsets();
    const maxHeight = winH - insets.top - insets.bottom - 24;

    return (
        <Modal supportedOrientations={ALL_ORIENTATIONS} visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={() => {/* GDPR consent is mandatory */}}>
            <View style={styles.overlay}>
                <View testID="gdpr-consent" style={[styles.card, isPortrait && styles.cardPortrait, isLandscape && styles.cardLandscape, { maxHeight }]}>
                    <ScrollView style={styles.scroll} contentContainerStyle={[styles.body, isLandscape && styles.bodyLandscape]} showsVerticalScrollIndicator>
                        <View style={[styles.iconRow, isLandscape && styles.iconRowLandscape]}>
                            <Ionicons name="shield-checkmark" size={isLandscape ? 28 : 40} color="#00d4ff" />
                        </View>
                        <Text style={styles.title}>{t('gdprTitle')}</Text>
                        <Text style={styles.text}>{t('gdprText')}</Text>

                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.bulletText}>{t('gdprBullet1')}</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.bulletText}>{t('gdprBullet2')}</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.bulletText}>{t('gdprBullet3')}</Text>
                        </View>
                    </ScrollView>

                    <View style={[styles.footer, isLandscape && styles.footerLandscape]}>
                        <TouchableOpacity testID="gdpr-accept" style={[styles.acceptButton, isLandscape && styles.acceptButtonLandscape]} onPress={onAccept}>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.acceptText}>{t('gdprAccept')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity testID="gdpr-learn-more" onPress={onShowPrivacy} style={styles.learnMoreBtn}>
                            <Text style={styles.learnMore}>{t('gdprLearnMore')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: MODAL_BACKDROP,
        justifyContent: 'center',
        alignItems: 'center',
    },
    // no hidden overflow here: on Android a card with it went blank after rotating
    card: {
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 255, 0.15)',
        maxWidth: 440,
        width: '85%',
        backgroundColor: MODAL_CARD,
    },
    cardPortrait: { width: '92%' },
    // landscape: wider, so the three points still show above the button at 130%
    cardLandscape: { width: '80%', maxWidth: 640 },
    scroll: { flexGrow: 0, flexShrink: 1 },
    body: { paddingTop: 28, paddingHorizontal: 28, paddingBottom: 4 },
    bodyLandscape: { paddingTop: 18 },
    iconRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
    iconRowLandscape: { marginBottom: 8 },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F0F0F0',
        textAlign: 'center',
        marginBottom: 12,
    },
    text: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
        paddingHorizontal: 8,
    },
    bulletText: {
        flex: 1,
        color: '#D1D5DB',
        fontSize: 13,
    },
    footer: { paddingHorizontal: 28, paddingTop: 16, paddingBottom: 20 },
    footerLandscape: { paddingTop: 10, paddingBottom: 12 },
    acceptButton: {
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    acceptButtonLandscape: { paddingVertical: 11 },
    acceptText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    learnMoreBtn: { paddingTop: 12, paddingBottom: 2 },
    learnMore: {
        color: '#60A5FA',
        fontSize: 13,
        textAlign: 'center',
        textDecorationLine: 'underline',
    },
});

export default GDPRConsent;
