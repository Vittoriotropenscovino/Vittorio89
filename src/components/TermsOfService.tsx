import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, useWindowDimensions } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

interface Props {
    visible: boolean;
    onClose: () => void;
}

const TermsOfService: React.FC<Props> = ({ visible, onClose }) => {
    const { t, language } = useApp();
    const isIT = language === 'it';
    const { height: screenH } = useWindowDimensions();

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, { height: screenH * 0.82 }]}>
                        <View style={styles.header}>
                            <Ionicons name="document-text" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('termsOfService')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={styles.scroll} showsVerticalScrollIndicator contentContainerStyle={{ paddingBottom: 30 }}>
                            <Text style={styles.updated}>{isIT ? 'Ultimo aggiornamento: Febbraio 2026' : 'Last updated: February 2026'}</Text>

                            <Text style={styles.sectionTitle}>{isIT ? '1. Accettazione' : '1. Acceptance'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'Utilizzando TravelSphere accetti i presenti termini di servizio. L\'app è fornita "così com\'è" senza garanzie.'
                                    : 'By using TravelSphere you accept these terms of service. The app is provided "as is" without warranties.'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '2. Uso dell\'App' : '2. App Usage'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'TravelSphere è un\'app personale per salvare memorie di viaggio. L\'utente è responsabile dei contenuti che salva nell\'app.'
                                    : 'TravelSphere is a personal app for saving travel memories. The user is responsible for the content saved in the app.'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '3. Dati e Backup' : '3. Data and Backup'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'I dati sono salvati localmente. Si consiglia di effettuare backup regolari tramite la funzione di esportazione. Non siamo responsabili per eventuali perdite di dati.'
                                    : 'Data is stored locally. Regular backups via the export feature are recommended. We are not responsible for any data loss.'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '4. Proprietà Intellettuale' : '4. Intellectual Property'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'TravelSphere e il suo design sono protetti da copyright. I contenuti creati dall\'utente rimangono di proprietà dell\'utente.'
                                    : 'TravelSphere and its design are copyright protected. User-created content remains the property of the user.'}
                            </Text>

                            <Text style={styles.sectionTitle}>{isIT ? '5. Modifiche' : '5. Changes'}</Text>
                            <Text style={styles.body}>
                                {isIT
                                    ? 'Ci riserviamo il diritto di modificare questi termini. Le modifiche saranno comunicate tramite aggiornamento dell\'app.'
                                    : 'We reserve the right to modify these terms. Changes will be communicated via app update.'}
                            </Text>
                        </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 550, width: '90%', padding: 24, backgroundColor: 'rgba(15,15,20,0.95)' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    scroll: { flex: 1 },
    updated: { color: '#6B7280', fontSize: 11, marginBottom: 16, fontStyle: 'italic' },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#60A5FA', marginTop: 16, marginBottom: 8 },
    body: { fontSize: 13, color: '#D1D5DB', lineHeight: 20 },
});

export default TermsOfService;
