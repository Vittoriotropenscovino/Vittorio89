import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

interface GDPRConsentProps {
    visible: boolean;
    onAccept: () => void;
    onShowPrivacy: () => void;
}

const GDPRConsent: React.FC<GDPRConsentProps> = ({ visible, onAccept, onShowPrivacy }) => {
    const { t } = useApp();

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated>
            <View style={styles.overlay}>
                <View style={[styles.card, styles.content]}>
                        <View style={styles.iconRow}>
                            <Ionicons name="shield-checkmark" size={40} color="#00d4ff" />
                        </View>
                        <Text style={styles.title}>{t('gdprTitle')}</Text>
                        <Text style={styles.text}>{t('gdprText')}</Text>

                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.bulletText}>Dati salvati solo localmente</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.bulletText}>Nessun tracciamento</Text>
                        </View>
                        <View style={styles.bulletRow}>
                            <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                            <Text style={styles.bulletText}>Eliminazione dati completa disponibile</Text>
                        </View>

                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                            <Ionicons name="checkmark" size={20} color="#fff" />
                            <Text style={styles.acceptText}>{t('gdprAccept')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={onShowPrivacy}>
                            <Text style={styles.learnMore}>{t('gdprLearnMore')}</Text>
                        </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    card: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0, 212, 255, 0.15)',
        maxWidth: 440,
        width: '85%',
    },
    content: {
        padding: 28,
        backgroundColor: 'rgba(15, 15, 20, 0.8)',
    },
    iconRow: {
        alignItems: 'center',
        marginBottom: 16,
    },
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
        color: '#D1D5DB',
        fontSize: 13,
    },
    acceptButton: {
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
    },
    acceptText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    learnMore: {
        color: '#60A5FA',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 14,
        textDecorationLine: 'underline',
    },
});

export default GDPRConsent;
