import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
    Switch, Alert, Platform, TextInput, ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import * as LocalAuthentication from 'expo-local-authentication';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { useApp } from '../contexts/AppContext';
import { Language } from '../i18n/translations';
import { Trip } from '../types';
import StorageService from '../services/StorageService';
import { validateImportData } from '../utils/validateTrip';

const LANGUAGE_OPTIONS: { code: Language; flag: string; labelKey: string }[] = [
    { code: 'it', flag: 'IT', labelKey: 'italian' },
    { code: 'en', flag: 'EN', labelKey: 'english' },
    { code: 'es', flag: 'ES', labelKey: 'spanish' },
    { code: 'fr', flag: 'FR', labelKey: 'french' },
    { code: 'de', flag: 'DE', labelKey: 'german' },
    { code: 'pt', flag: 'PT', labelKey: 'portuguese' },
    { code: 'zh', flag: 'ZH', labelKey: 'chinese' },
    { code: 'ja', flag: 'JA', labelKey: 'japanese' },
];

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
        // Privacy warning before export
        Alert.alert(
            t('privacy') as string,
            t('exportPrivacyWarning') as string,
            [
                { text: t('cancel') as string, style: 'cancel' },
                {
                    text: t('confirm') as string,
                    onPress: async () => {
                        try {
                            const backupData = { trips };
                            const dataString = JSON.stringify(backupData);
                            const checksum = await Crypto.digestStringAsync(
                                Crypto.CryptoDigestAlgorithm.SHA256, dataString
                            );
                            const backup = { schemaVersion: 1, checksum, createdAt: new Date().toISOString(), data: backupData };
                            const data = JSON.stringify(backup, null, 2);
                            const fileUri = FileSystem.cacheDirectory + 'travelsphere_backup.json';
                            await FileSystem.writeAsStringAsync(fileUri, data);
                            const canShare = await Sharing.isAvailableAsync();
                            if (canShare) {
                                await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'TravelSphere Backup' });
                            } else {
                                Alert.alert('', t('exportSuccess') as string);
                            }
                            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        } catch (e) {
                            console.error('Export error:', e);
                            Alert.alert(t('error') as string, String(e));
                        }
                    },
                },
            ],
        );
    };

    const handleImport = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });
            if (result.canceled || !result.assets || result.assets.length === 0) return;
            const content = await FileSystem.readAsStringAsync(result.assets[0].uri);

            const { valid, data, hasChecksum } = await StorageService.validateBackup(content);

            const doImport = () => {
                const importResult = validateImportData(data, trips);

                if (importResult.trips.length === 0) {
                    Alert.alert(t('error') as string, t('importNoValidTrips') as string);
                    return;
                }

                const message = (t('importValidTrips') as string)
                    .replace('{valid}', String(importResult.trips.length))
                    .replace('{skipped}', String(importResult.skipped));

                Alert.alert(
                    t('importData') as string,
                    message,
                    [
                        { text: t('cancel') as string, style: 'cancel' },
                        {
                            text: t('confirm') as string,
                            onPress: () => {
                                onTripsUpdate([...trips, ...importResult.trips]);
                                if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                Alert.alert('', t('importSuccess') as string);
                            },
                        },
                    ],
                );
            };

            if (hasChecksum && !valid) {
                Alert.alert(
                    t('warning') as string,
                    t('backupCorruptWarning') as string,
                    [
                        { text: t('cancel') as string, style: 'cancel' },
                        { text: t('confirm') as string, onPress: doImport },
                    ],
                );
            } else {
                doImport();
            }
        } catch (e) {
            console.error('Import error:', e);
            Alert.alert(t('error') as string, t('importError') as string);
        }
    };

    const handleCleanMedia = async () => {
        try {
            const result = await StorageService.cleanOrphanedMedia();
            if (result.deletedCount === 0) {
                Alert.alert('', t('cleanMediaNone') as string);
            } else {
                const mb = (result.freedBytes / (1024 * 1024)).toFixed(1);
                const message = (t('cleanMediaResult') as string)
                    .replace('{count}', String(result.deletedCount))
                    .replace('{size}', mb);
                Alert.alert('', message);
            }
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (e) {
            console.error('Clean media error:', e);
            Alert.alert(t('error') as string, String(e));
        }
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
        try {
            const backupData = { trips };
            const dataString = JSON.stringify(backupData);
            const checksum = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256, dataString
            );
            const backup = { schemaVersion: 1, checksum, createdAt: new Date().toISOString(), data: backupData };
            const backupDir = FileSystem.documentDirectory + 'backups/';
            const dirInfo = await FileSystem.getInfoAsync(backupDir);
            if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });
            const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
            await FileSystem.writeAsStringAsync(backupDir + filename, JSON.stringify(backup, null, 2));
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('', t('backupSuccess') as string);
        } catch (e) {
            Alert.alert(t('error') as string, String(e));
        }
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
            <BlurView intensity={30} tint="dark" style={styles.overlay}>
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
                            <View style={styles.langGrid}>
                                {LANGUAGE_OPTIONS.map((lang) => (
                                    <TouchableOpacity
                                        key={lang.code}
                                        style={[styles.langButton, language === lang.code && styles.langActive]}
                                        onPress={() => setLanguage(lang.code)}
                                    >
                                        <Text style={styles.langFlag}>{lang.flag}</Text>
                                        <Text style={[styles.langText, language === lang.code && styles.langTextActive]}>
                                            {t(lang.labelKey as any)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
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

                            <SettingRow
                                icon="git-network-outline"
                                iconColor="#F59E0B"
                                label={t('showTravelLines') as string}
                                right={
                                    <Switch
                                        value={settings.showTravelLines !== false}
                                        onValueChange={(v) => updateSettings({ showTravelLines: v })}
                                        trackColor={{ false: '#374151', true: 'rgba(245,158,11,0.4)' }}
                                        thumbColor={settings.showTravelLines !== false ? '#F59E0B' : '#6B7280'}
                                    />
                                }
                            />

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
                            {Platform.OS !== 'web' && (
                                <SettingRow icon="images-outline" iconColor="#F59E0B" label={t('cleanMedia') as string} onPress={handleCleanMedia} />
                            )}
                            <SettingRow icon="trash-outline" label={t('deleteAllData') as string} onPress={handleDeleteAll} destructive iconColor="#EF4444" />

                            <SectionHeader title={t('privacy') as string} />
                            <SettingRow icon="shield-checkmark-outline" label={t('privacyPolicy') as string} onPress={onShowPrivacy} />
                            <SettingRow icon="document-text-outline" label={t('termsOfService') as string} onPress={onShowTerms} />

                            <SettingRow
                                icon="refresh-outline"
                                iconColor="#A78BFA"
                                label={t('replayOnboarding') as string}
                                onPress={() => {
                                    Alert.alert(
                                        t('replayOnboarding') as string,
                                        language === 'it'
                                            ? 'Rivedrai la selezione lingua e le slide introduttive al prossimo avvio.'
                                            : 'You will see the language selection and intro slides on next launch.',
                                        [
                                            { text: t('cancel') as string, style: 'cancel' },
                                            {
                                                text: t('confirm') as string,
                                                onPress: () => {
                                                    updateSettings({ hasSeenOnboarding: false, hasAcceptedGDPR: false });
                                                    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                                    onClose();
                                                },
                                            },
                                        ],
                                    );
                                }}
                            />

                            <SectionHeader title={t('about') as string} />
                            <SettingRow
                                icon="information-circle-outline"
                                label={t('appVersion') as string}
                                right={<Text style={styles.versionText}>1.0.0</Text>}
                            />

                            <View style={{ height: 20 }} />
                        </ScrollView>
                </View>
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
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
    langGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    langButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, width: '48%' },
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
