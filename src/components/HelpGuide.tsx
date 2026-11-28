import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { TranslationKey } from '../i18n/translations';
import ReadingCard from './ReadingCard';

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

    return (
        <ReadingCard visible={visible} onClose={onClose} icon="help-circle" title={t('helpGuideTitle') as string} testID="help">
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
        </ReadingCard>
    );
};

const styles = StyleSheet.create({
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
