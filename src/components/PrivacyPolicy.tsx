import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, useWindowDimensions } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ visible, onClose }) => {
    const { t } = useApp();
    const { height: screenH, width: screenW } = useWindowDimensions();
    const cardHeight = Math.min(screenH * 0.85, screenW < screenH ? screenH * 0.8 : screenH * 0.9);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, { height: cardHeight }]}>
                    <View style={styles.headerWrap}>
                        <View style={styles.header}>
                            <Ionicons name="shield-checkmark" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('privacyPolicy')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        bounces={true}
                        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
                    >
                        <Text style={styles.updated}>{t('privacyUpdated')}</Text>

                        <Text style={styles.sectionTitle}>{t('privacyDataCollection')}</Text>
                        <Text style={styles.body}>{t('privacyDataCollectionBody')}</Text>

                        <Text style={styles.sectionTitle}>{t('privacyLocalData')}</Text>
                        <Text style={styles.body}>{t('privacyLocalDataBody')}</Text>

                        <Text style={styles.sectionTitle}>{t('privacyExternalServices')}</Text>
                        <Text style={styles.body}>{t('privacyExternalServicesBody')}</Text>

                        <Text style={styles.sectionTitle}>{t('privacyGeocodingServices')}</Text>
                        <Text style={styles.body}>{t('privacyGeocodingBody')}</Text>

                        <Text style={styles.sectionTitle}>{t('privacyRights')}</Text>
                        <Text style={styles.body}>{t('privacyRightsBody')}</Text>

                        <Text style={styles.sectionTitle}>{t('privacyContact')}</Text>
                        <Text style={styles.body}>{t('privacyContactBody')}</Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 550, width: '90%', backgroundColor: 'rgba(15,15,20,0.95)' },
    headerWrap: { paddingTop: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    scroll: { flexGrow: 1, flexShrink: 1 },
    updated: { color: '#6B7280', fontSize: 11, marginBottom: 16, fontStyle: 'italic' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#60A5FA', marginTop: 16, marginBottom: 8 },
    body: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
});

export default PrivacyPolicy;
