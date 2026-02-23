import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
    Switch, Alert, Platform, TextInput, ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import { useApp } from '../contexts/AppContext';
import { Trip } from '../types';
import StorageService from '../services/StorageService';

interface Props {
    visible: boolean;
    onClose: () => void;
    trips: Trip[];
    onTripsUpdate: (trips: Trip[]) => void;
    onShowPrivacy: () => void;
    onShowTerms: () => void;
    onItinerariesReset?: () => void;
}

const SettingsScreen: React.FC<Props> = ({
    visible, onClose, trips, onTripsUpdate, onShowPrivacy, onShowTerms, onItinerariesReset,
}) => {
    const { t, language, setLanguage, settings, updateSettings } = useApp();
    const [importing, setImporting] = useState(false);
    const [homeQuery, setHomeQuery] = useState('');
    const [searchingHome, setSearchingHome] = useState(false);

    const handleExport = async () => {
        try {
            const data = JSON.stringify({ trips, exportDate: new Date().toISOString(), version: '1.0' }, null, 2);
            const fileUri = FileSystem.cacheDirectory + 'travelsphere_backup.json';
            await FileSystem.writeAsStringAsync(fileUri, data);
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
                await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'TravelSphere Backup' });
            }
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('', t('exportSuccess') as string);
        } catch (e) {
            console.error('Export error:', e);
            Alert.alert(t('error') as string, String(e));
        }
    };

    const handleImport = async () => {
        Alert.alert(
            t('importData') as string,
            language === 'it'
                ? 'Per importare, condividi il file .json di backup con TravelSphere'
                : 'To import, share the backup .json file with TravelSphere',
        );
    };

    const handleDeleteAll = () => {
        Alert.alert(
            t('deleteAllData') as string,
            t('deleteAllConfirm') as string,
            [
                { text: t('cancel') as string, style: 'cancel' },
                {
                    text: t('delete') as string,
                    style: 'destructive',
                    onPress: async () => {
                        await StorageService.clearAll();
                        onTripsUpdate([]);
                        if (onItinerariesReset) onItinerariesReset();
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    },
                },
            ],
        );
    };

    const handleBiometricToggle = async (value: boolean) => {
        if (value) {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();
            if (!hasHardware || !isEnrolled) {
                Alert.alert('', t('biometricNotAvailable') as string);
                return;
            }
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: t('biometricPrompt') as string,
            });
            if (result.success) {
                updateSettings({ biometricEnabled: true });
            }
        } else {
            updateSettings({ biometricEnabled: false });
        }
    };

    const handleCloudBackup = async () => {
        await handleExport();
    };

    const handleSearchHome = async () => {
        if (!homeQuery.trim()) return;
        setSearchingHome(true);
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(homeQuery.trim())}&limit=1`,
                { headers: { 'User-Agent': 'TravelSphere/1.0' } }
            );
            const data = await res.json();
            if (data && data.length > 0) {
                const result = data[0];
                updateSettings({
                    homeLocation: {
                        latitude: parseFloat(result.lat),
                        longitude: parseFloat(result.lon),
                        name: result.display_name.split(',').slice(0, 2).join(',').trim(),
                    },
                });
                setHomeQuery('');
                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('', t('homeSet') as string);
            } else {
                Alert.alert('', t('locationNotFound') as string);
            }
        } catch (e) {
            Alert.alert('', t('searchError') as string);
        }
        setSearchingHome(false);
    };

    const handleRemoveHome = () => {
        updateSettings({ homeLocation: undefined });
    };

    const SettingRow = ({ icon, iconColor, label, onPress, right, destructive }: {
        icon: string; iconColor?: string; label: string; onPress?: () => void;
        right?: React.ReactNode; destructive?: boolean;
    }) => (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            disabled={!onPress && !right}
            activeOpacity={onPress ? 0.7 : 1}
        >
            <View style={[styles.settingIcon, { backgroundColor: destructive ? 'rgba(239,68,68,0.15)' : 'rgba(0,212,255,0.08)' }]}>
                <Ionicons name={icon as any} size={18} color={iconColor || (destructive ? '#EF4444' : '#00d4ff')} />
            </View>
            <Text style={[styles.settingLabel, destructive && { color: '#EF4444' }]}>{label}</Text>
            {right || (onPress && <Ionicons name="chevron-forward" size={18} color="#4B5563" />)}
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }: { title: string }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, styles.content]}>
                        <View style={styles.header}>
                            <Ionicons name="settings" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('settings')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                            <SectionHeader title={t('language') as string} />
                            <View style={styles.langRow}>
                                <TouchableOpacity
                                    style={[styles.langButton, language === 'it' && styles.langActive]}
                                    onPress={() => setLanguage('it')}
                                >
                                    <Text style={styles.langFlag}>IT</Text>
                                    <Text style={[styles.langText, language === 'it' && styles.langTextActive]}>{t('italian')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.langButton, language === 'en' && styles.langActive]}
                                    onPress={() => setLanguage('en')}
                                >
                                    <Text style={styles.langFlag}>EN</Text>
                                    <Text style={[styles.langText, language === 'en' && styles.langTextActive]}>{t('english')}</Text>
                                </TouchableOpacity>
                            </View>

                            <SectionHeader title={t('homeLocation') as string} />
                            {settings.homeLocation ? (
                                <View style={styles.homeDisplay}>
                                    <View style={styles.homeInfo}>
                                        <Ionicons name="home" size={18} color="#FFD700" />
                                        <Text style={styles.homeText}>{settings.homeLocation.name}</Text>
                                    </View>
                                    <TouchableOpacity onPress={handleRemoveHome} style={styles.homeRemoveBtn}>
                                        <Ionicons name="close-circle" size={20} color="#EF4444" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <Text style={styles.homeNotSet}>{t('homeNotSet')}</Text>
                            )}
                            <View style={styles.homeSearchRow}>
                                <TextInput
                                    style={styles.homeInput}
                                    placeholder={t('homeLocationPlaceholder') as string}
                                    placeholderTextColor="#4B5563"
                                    value={homeQuery}
                                    onChangeText={setHomeQuery}
                                    onSubmitEditing={handleSearchHome}
                                    returnKeyType="search"
                                />
                                <TouchableOpacity
                                    style={styles.homeSearchBtn}
                                    onPress={handleSearchHome}
                                    disabled={searchingHome}
                                >
                                    {searchingHome ? (
                                        <ActivityIndicator size="small" color="#00d4ff" />
                                    ) : (
                                        <Ionicons name="search" size={18} color="#00d4ff" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {settings.homeLocation && (
                                <SettingRow
                                    icon="git-network-outline"
                                    iconColor="#FFD700"
                                    label={t('showHomeLines') as string}
                                    right={
                                        <Switch
                                            value={settings.showHomeLines !== false}
                                            onValueChange={(v) => updateSettings({ showHomeLines: v })}
                                            trackColor={{ false: '#374151', true: 'rgba(255,215,0,0.4)' }}
                                            thumbColor={settings.showHomeLines !== false ? '#FFD700' : '#6B7280'}
                                        />
                                    }
                                />
                            )}

                            <SectionHeader title={t('security') as string} />
                            <SettingRow
                                icon="finger-print"
                                label={t('biometricLock') as string}
                                right={
                                    <Switch
                                        value={settings.biometricEnabled}
                                        onValueChange={handleBiometricToggle}
                                        trackColor={{ false: '#374151', true: 'rgba(0,212,255,0.4)' }}
                                        thumbColor={settings.biometricEnabled ? '#00d4ff' : '#6B7280'}
                                    />
                                }
                            />

                            <SectionHeader title={t('dataManagement') as string} />
                            <SettingRow icon="download-outline" label={t('exportData') as string} onPress={handleExport} />
                            <SettingRow icon="push-outline" label={t('importData') as string} onPress={handleImport} />
                            <SettingRow icon="cloud-upload-outline" label={t('cloudBackup') as string} onPress={handleCloudBackup} />
                            <SettingRow icon="trash-outline" label={t('deleteAllData') as string} onPress={handleDeleteAll} destructive iconColor="#EF4444" />

                            <SectionHeader title={t('privacy') as string} />
                            <SettingRow icon="shield-checkmark-outline" label={t('privacyPolicy') as string} onPress={onShowPrivacy} />
                            <SettingRow icon="document-text-outline" label={t('termsOfService') as string} onPress={onShowTerms} />

                            <SectionHeader title={t('about') as string} />
                            <SettingRow
                                icon="information-circle-outline"
                                label={t('appVersion') as string}
                                right={<Text style={styles.versionText}>1.0.0</Text>}
                            />

                            <View style={{ height: 20 }} />
                        </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 480, width: '88%', maxHeight: '92%' },
    content: { flex: 1, padding: 24, backgroundColor: 'rgba(15,15,20,0.85)' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    scroll: { flex: 1 },
    sectionHeader: { color: '#60A5FA', fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
    settingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
    settingIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    settingLabel: { flex: 1, color: '#E5E7EB', fontSize: 14, fontWeight: '500' },
    langRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
    langButton: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12 },
    langActive: { borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.08)' },
    langFlag: { fontSize: 16, fontWeight: '800', color: '#00d4ff' },
    langText: { color: '#9CA3AF', fontSize: 14 },
    langTextActive: { color: '#00d4ff', fontWeight: '600' },
    versionText: { color: '#6B7280', fontSize: 13 },
    // Home location styles
    homeDisplay: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: 'rgba(255,215,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)',
        borderRadius: 12, padding: 12, marginBottom: 10,
    },
    homeInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    homeText: { color: '#E5E7EB', fontSize: 14, fontWeight: '500', flex: 1 },
    homeRemoveBtn: { padding: 4 },
    homeNotSet: { color: '#6B7280', fontSize: 13, fontStyle: 'italic', marginBottom: 8 },
    homeSearchRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    homeInput: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#E5E7EB', fontSize: 14,
    },
    homeSearchBtn: {
        backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)',
        borderRadius: 12, width: 44, justifyContent: 'center', alignItems: 'center',
    },
});

export default SettingsScreen;
