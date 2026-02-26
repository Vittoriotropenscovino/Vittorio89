import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const PrivacyPolicy: React.FC<Props> = ({ visible, onClose }) => {
    const { t, language } = useApp();
    const isIT = language === 'it';

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, styles.content]}>
                        <View style={styles.header}>
                            <Ionicons name="shield-checkmark" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('privacyPolicy')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                            <Text style={styles.updated}>{isIT ? 'Ultimo aggiornamento: Febbraio 2026' : 'Last updated: February 2026'}</Text>

                            <Text style={styles.sectionTitle}>{isIT ? '1. Raccolta Dati' : '1. Data Collection'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'TravelSphere NON raccoglie, trasmette o condivide alcun dato personale. Tutte le informazioni (viaggi, foto, note) sono salvate esclusivamente sul tuo dispositivo.'
                                    : 'TravelSphere does NOT collect, transmit or share any personal data. All information (trips, photos, notes) is stored exclusively on your device.'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '2. Dati Salvati Localmente' : '2. Locally Stored Data'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? '• Informazioni sui viaggi (titolo, luogo, date, note)\n• Coordinate GPS dei luoghi\n• Foto e video associati ai viaggi\n• Preferenze dell\'app (lingua, impostazioni)'
                                    : '• Trip information (title, location, dates, notes)\n• GPS coordinates of places\n• Photos and videos associated with trips\n• App preferences (language, settings)'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '3. Servizi Esterni' : '3. External Services'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'L\'app utilizza OpenStreetMap Nominatim per la geocodifica dei luoghi. Questo servizio riceve solo il nome del luogo cercato, senza alcun identificativo personale.'
                                    : 'The app uses OpenStreetMap Nominatim for geocoding places. This service only receives the searched place name, without any personal identifier.'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '4. I Tuoi Diritti' : '4. Your Rights'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'Puoi in qualsiasi momento:\n• Eliminare singoli viaggi\n• Eliminare tutti i dati dell\'app dalle Impostazioni\n• Disinstallare l\'app (rimuove tutti i dati)'
                                    : 'You can at any time:\n• Delete individual trips\n• Delete all app data from Settings\n• Uninstall the app (removes all data)'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '5. Contatti' : '5. Contact'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'Per domande sulla privacy: travelsphere@app.com'
                                    : 'For privacy questions: travelsphere@app.com'}
                            </Text>
                        </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 550, width: '90%', maxHeight: '85%' },
    content: { padding: 24, backgroundColor: 'rgba(15,15,20,0.85)', flex: 1 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    scroll: { flex: 1 },
    updated: { color: '#6B7280', fontSize: 11, marginBottom: 16, fontStyle: 'italic' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#60A5FA', marginTop: 16, marginBottom: 8 },
    body: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
});

export default PrivacyPolicy;
