import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { TranslationKey } from '../i18n/translations';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const GUIDE_SECTIONS: { icon: string; titleKey: TranslationKey; textKey: TranslationKey }[] = [
    { icon: 'add-circle', titleKey: 'helpAddTripTitle', textKey: 'helpAddTripText' },
    { icon: 'globe', titleKey: 'helpGlobeTitle', textKey: 'helpGlobeText' },
    { icon: 'eye', titleKey: 'helpFogTitle', textKey: 'helpFogText' },
    { icon: 'git-merge', titleKey: 'helpItineraryTitle', textKey: 'helpItineraryText' },
    { icon: 'airplane', titleKey: 'helpLinesTitle', textKey: 'helpLinesText' },
    { icon: 'shield-checkmark', titleKey: 'helpBackupTitle', textKey: 'helpBackupText' },
    { icon: 'heart', titleKey: 'helpWishlistTitle', textKey: 'helpWishlistText' },
    { icon: 'stats-chart', titleKey: 'helpStatsTitle', textKey: 'helpStatsText' },
];

const HelpGuide: React.FC<Props> = ({ visible, onClose }) => {
    const { t } = useApp();
    const { height: screenH, width: screenW } = useWindowDimensions();
    const cardHeight = Math.min(screenH * 0.85, screenW < screenH ? screenH * 0.8 : screenH * 0.9);

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, { height: cardHeight }]}>
                    <View style={styles.headerWrap}>
                        <View style={styles.header}>
                            <Ionicons name="help-circle" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('helpGuideTitle')}</Text>
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
                        {GUIDE_SECTIONS.map((section, index) => (
                            <View
                                key={section.titleKey}
                                style={[
                                    styles.section,
                                    index < GUIDE_SECTIONS.length - 1 && styles.sectionBorder,
                                ]}
                            >
                                <View style={styles.iconContainer}>
                                    <Ionicons name={section.icon as any} size={24} color="#00d4ff" />
                                </View>
                                <View style={styles.textContainer}>
                                    <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
                                    <Text style={styles.sectionText}>{t(section.textKey)}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 550, width: '90%', backgroundColor: 'rgba(5,5,16,0.97)' },
    headerWrap: { paddingTop: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    scroll: { flexGrow: 1, flexShrink: 1 },
    section: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 16, gap: 14 },
    sectionBorder: { borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.15)' },
    iconContainer: {
        width: 44, height: 44, borderRadius: 12,
        backgroundColor: 'rgba(0,212,255,0.08)',
        justifyContent: 'center', alignItems: 'center',
    },
    textContainer: { flex: 1 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#F0F0F0', marginBottom: 4 },
    sectionText: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
});

export default HelpGuide;
