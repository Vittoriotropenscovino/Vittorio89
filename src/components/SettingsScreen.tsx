import React, { useState } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Alert,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SettingsScreenProps, HomeLocation } from '../types';
import { geocodeWithNominatim } from '../utils/geocoding';

const SettingsScreen: React.FC<SettingsScreenProps> = ({
    visible,
    onClose,
    homeLocation,
    onSetHome,
    onClearData,
}) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;

    const [homeQuery, setHomeQuery] = useState('');
    const [isSearchingHome, setIsSearchingHome] = useState(false);

    const handleSetHome = async () => {
        if (!homeQuery.trim()) {
            Alert.alert('Errore', 'Inserisci il nome della tua citta.');
            return;
        }

        setIsSearchingHome(true);
        try {
            const results = await geocodeWithNominatim(homeQuery);
            if (results && results.length > 0) {
                const place = results[0];
                const nameParts = place.display_name.split(', ');
                const displayName = nameParts.slice(0, 3).join(', ');

                onSetHome({
                    latitude: parseFloat(place.lat),
                    longitude: parseFloat(place.lon),
                    locationName: displayName,
                });

                setHomeQuery('');
                Alert.alert('Casa impostata!', `La tua posizione di casa e stata impostata a:\n${displayName}`);
            } else {
                Alert.alert('Non trovato', 'Luogo non trovato. Prova con un nome diverso.');
            }
        } catch (error) {
            Alert.alert('Errore', 'Errore durante la ricerca. Controlla la connessione.');
        } finally {
            setIsSearchingHome(false);
        }
    };

    const handleClearData = () => {
        Alert.alert(
            'Cancella tutti i dati',
            'Sei sicuro? Questa azione eliminera tutti i viaggi, le foto e le impostazioni. Non puo essere annullata.',
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Cancella Tutto',
                    style: 'destructive',
                    onPress: onClearData,
                },
            ]
        );
    };

    const containerWidth = isTablet ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.88;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView
                    intensity={50}
                    style={[styles.container, { width: containerWidth, maxWidth: 600, maxHeight: SCREEN_HEIGHT * 0.85 }]}
                    tint="dark"
                >
                    <View style={styles.innerContainer}>
                        {/* Fixed header - NOT inside ScrollView */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Ionicons name="settings" size={24} color="#60A5FA" />
                                <Text style={styles.headerTitle}>Impostazioni</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={26} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Scrollable content */}
                        <ScrollView
                            style={styles.scrollContent}
                            contentContainerStyle={styles.scrollContentContainer}
                            showsVerticalScrollIndicator={true}
                            bounces={true}
                        >
                            {/* Home Location Section */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="home" size={20} color="#F59E0B" />
                                    <Text style={styles.sectionTitle}>Posizione di Casa</Text>
                                </View>

                                {homeLocation ? (
                                    <View style={styles.homeInfo}>
                                        <View style={styles.homeLocationRow}>
                                            <Ionicons name="location" size={16} color="#10B981" />
                                            <Text style={styles.homeLocationText}>
                                                {homeLocation.locationName}
                                            </Text>
                                        </View>
                                        <Text style={styles.homeHint}>
                                            Il pin di casa e visibile sul globo con le linee verso i tuoi viaggi
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={styles.noHomeText}>
                                        Nessuna posizione di casa impostata
                                    </Text>
                                )}

                                <View style={styles.homeSearchRow}>
                                    <TextInput
                                        style={styles.homeInput}
                                        placeholder={homeLocation ? 'Cambia posizione...' : 'es. Roma, Italia'}
                                        placeholderTextColor="#6B7280"
                                        value={homeQuery}
                                        onChangeText={setHomeQuery}
                                        onSubmitEditing={handleSetHome}
                                        returnKeyType="search"
                                    />
                                    <TouchableOpacity
                                        style={styles.homeSearchBtn}
                                        onPress={handleSetHome}
                                        disabled={isSearchingHome}
                                    >
                                        {isSearchingHome ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Ionicons name="search" size={20} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* App Info Section */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="information-circle" size={20} color="#60A5FA" />
                                    <Text style={styles.sectionTitle}>Informazioni</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>App</Text>
                                    <Text style={styles.infoValue}>TravelSphere</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Versione</Text>
                                    <Text style={styles.infoValue}>1.0.0</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Motore</Text>
                                    <Text style={styles.infoValue}>React Native + Three.js</Text>
                                </View>
                            </View>

                            {/* Data Section */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="server" size={20} color="#60A5FA" />
                                    <Text style={styles.sectionTitle}>Dati e Archiviazione</Text>
                                </View>
                                <Text style={styles.dataHint}>
                                    I tuoi dati sono salvati localmente sul dispositivo.
                                </Text>
                                <TouchableOpacity
                                    style={styles.dangerBtn}
                                    onPress={handleClearData}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash" size={18} color="#EF4444" />
                                    <Text style={styles.dangerBtnText}>Cancella tutti i dati</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Privacy Policy Section */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                                    <Text style={styles.sectionTitle}>Privacy Policy</Text>
                                </View>
                                <View style={styles.privacyContent}>
                                    <Text style={styles.privacyText}>
                                        TravelSphere rispetta la tua privacy. Tutti i dati (viaggi, foto, video e impostazioni) vengono salvati esclusivamente sul tuo dispositivo in modo locale.
                                    </Text>
                                    <Text style={styles.privacyText}>
                                        L'app utilizza i seguenti servizi esterni:
                                    </Text>
                                    <Text style={styles.privacyBullet}>
                                        - OpenStreetMap Nominatim per la ricerca dei luoghi
                                    </Text>
                                    <Text style={styles.privacyBullet}>
                                        - Texture del globo da CDN pubbliche (three.js, unpkg)
                                    </Text>
                                    <Text style={styles.privacyText}>
                                        Nessun dato personale viene inviato a server esterni. Le tue foto e i tuoi ricordi rimangono sul tuo dispositivo.
                                    </Text>
                                    <Text style={styles.privacyText}>
                                        Per domande sulla privacy, contatta lo sviluppatore.
                                    </Text>
                                </View>
                            </View>

                            {/* Bottom padding */}
                            <View style={{ height: 40 }} />
                        </ScrollView>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    innerContainer: {
        backgroundColor: 'rgba(15, 15, 20, 0.7)',
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    closeBtn: {
        padding: 6,
    },
    scrollContent: {
        flex: 1,
    },
    scrollContentContainer: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#F9FAFB',
    },
    homeInfo: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.15)',
    },
    homeLocationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    homeLocationText: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
    homeHint: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 8,
    },
    noHomeText: {
        color: '#6B7280',
        fontSize: 13,
        marginBottom: 12,
    },
    homeSearchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    homeInput: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
    },
    homeSearchBtn: {
        backgroundColor: '#F59E0B',
        borderRadius: 12,
        width: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    infoLabel: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    infoValue: {
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '500',
    },
    dataHint: {
        color: '#6B7280',
        fontSize: 13,
        marginBottom: 14,
    },
    dangerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.2)',
    },
    dangerBtnText: {
        color: '#EF4444',
        fontSize: 14,
        fontWeight: '600',
    },
    privacyContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    privacyText: {
        color: '#9CA3AF',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 10,
    },
    privacyBullet: {
        color: '#9CA3AF',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 4,
        paddingLeft: 8,
    },
});

export default SettingsScreen;
