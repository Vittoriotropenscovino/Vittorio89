import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { useApp } from '../contexts/AppContext';
import ReadingCard from './ReadingCard';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ visible, onClose }) => {
    const { t } = useApp();

    return (
        <ReadingCard visible={visible} onClose={onClose} icon="shield-checkmark" title={t('privacyPolicy') as string} testID="privacy">
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
        </ReadingCard>
    );
};

const styles = StyleSheet.create({
    updated: { color: '#6B7280', fontSize: 11, marginBottom: 16, fontStyle: 'italic' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#60A5FA', marginTop: 16, marginBottom: 8 },
    body: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
});

export default PrivacyPolicy;
