import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView,
    TextInput, Alert, Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, Itinerary } from '../types';
import { useApp } from '../contexts/AppContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    itineraries: Itinerary[];
    trips: Trip[];
    onCreateItinerary: (name: string) => void;
    onDeleteItinerary: (id: string) => void;
    onRenameItinerary: (id: string, newName: string) => void;
    onFlythrough?: (stops: { lat: number; lng: number }[]) => void;
}

const ItineraryManager: React.FC<Props> = ({
    visible, onClose, itineraries, trips,
    onCreateItinerary, onDeleteItinerary, onRenameItinerary, onFlythrough,
}) => {
    const { t } = useApp();
    const [newName, setNewName] = useState('');
    const [renameId, setRenameId] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');

    const getTripsForItinerary = (itinerary: Itinerary): Trip[] => {
        return trips.filter(tr => tr.itineraryId === itinerary.id);
    };

    const handleCreate = () => {
        if (!newName.trim()) return;
        onCreateItinerary(newName.trim());
        setNewName('');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleDelete = (itinerary: Itinerary) => {
        Alert.alert(
            t('deleteItinerary') as string,
            t('deleteItineraryConfirm') as string,
            [
                { text: t('cancel') as string, style: 'cancel' },
                {
                    text: t('delete') as string,
                    style: 'destructive',
                    onPress: () => {
                        onDeleteItinerary(itinerary.id);
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    },
                },
            ],
        );
    };

    const handleStartRename = (itinerary: Itinerary) => {
        setRenameId(itinerary.id);
        setRenameValue(itinerary.name);
    };

    const handleConfirmRename = () => {
        if (renameId && renameValue.trim()) {
            onRenameItinerary(renameId, renameValue.trim());
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setRenameId(null);
        setRenameValue('');
    };

    const handleCancelRename = () => {
        setRenameId(null);
        setRenameValue('');
    };

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, styles.content]}>
                        <View style={styles.header}>
                            <Ionicons name="git-merge-outline" size={24} color="#F59E0B" />
                            <Text style={styles.title}>{t('itineraries')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Create section */}
                        <View style={styles.createSection}>
                            <TextInput
                                style={styles.createInput}
                                placeholder={t('itineraryNamePlaceholder') as string}
                                placeholderTextColor="#4B5563"
                                value={newName}
                                onChangeText={setNewName}
                                onSubmitEditing={handleCreate}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
                                onPress={handleCreate}
                                disabled={!newName.trim()}
                            >
                                <Ionicons name="add" size={20} color={newName.trim() ? '#fff' : '#6B7280'} />
                                <Text style={[styles.createBtnText, !newName.trim() && { color: '#6B7280' }]}>
                                    {t('createItinerary')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Itinerary list */}
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                            {itineraries.length === 0 ? (
                                <View style={styles.emptyState}>
                                    <Ionicons name="git-merge-outline" size={40} color="rgba(255,255,255,0.15)" />
                                    <Text style={styles.emptyTitle}>{t('noItineraries')}</Text>
                                    <Text style={styles.emptySubtext}>{t('createFirstItinerary')}</Text>
                                </View>
                            ) : (
                                itineraries.map((itinerary) => {
                                    const itTrips = getTripsForItinerary(itinerary);
                                    return (
                                        <View key={itinerary.id} style={styles.itineraryCard}>
                                            <View style={styles.itineraryHeader}>
                                                <View style={styles.itineraryIcon}>
                                                    <Ionicons name="git-merge-outline" size={18} color="#F59E0B" />
                                                </View>
                                                <View style={styles.itineraryInfo}>
                                                    <Text style={styles.itineraryName} numberOfLines={1}>{itinerary.name}</Text>
                                                    <Text style={styles.itineraryMeta}>
                                                        {itTrips.length} {t('itineraryTrips')}
                                                    </Text>
                                                </View>
                                                {itTrips.length >= 2 && onFlythrough && (
                                                    <TouchableOpacity
                                                        style={[styles.actionBtn, { backgroundColor: 'rgba(16,185,129,0.15)', borderRadius: 8 }]}
                                                        onPress={() => {
                                                            const stops = itTrips.map(tr => ({ lat: tr.latitude, lng: tr.longitude }));
                                                            onFlythrough(stops);
                                                            onClose();
                                                        }}
                                                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                    >
                                                        <Ionicons name="play" size={16} color="#10B981" />
                                                    </TouchableOpacity>
                                                )}
                                                <TouchableOpacity
                                                    style={styles.actionBtn}
                                                    onPress={() => handleStartRename(itinerary)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Ionicons name="pencil" size={16} color="#60A5FA" />
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={styles.actionBtn}
                                                    onPress={() => handleDelete(itinerary)}
                                                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                                >
                                                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                </TouchableOpacity>
                                            </View>
                                            {itTrips.length > 0 && (
                                                <View style={styles.tripList}>
                                                    {itTrips.map((trip, idx) => (
                                                        <View key={trip.id} style={styles.tripItem}>
                                                            <View style={styles.tripDot} />
                                                            {idx < itTrips.length - 1 && <View style={styles.tripLine} />}
                                                            <Text style={styles.tripItemText} numberOfLines={1}>
                                                                {trip.title} - {trip.locationName.split(',')[0]}
                                                            </Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            )}
                                        </View>
                                    );
                                })
                            )}
                            <View style={{ height: 20 }} />
                        </ScrollView>
                </View>
            </View>

            {/* Rename modal */}
            <Modal visible={renameId !== null} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={handleCancelRename}>
                <View style={styles.renameOverlay}>
                    <View style={styles.renameCard}>
                        <Text style={styles.renameTitle}>{t('renameItinerary')}</Text>
                        <TextInput
                            style={styles.renameInput}
                            value={renameValue}
                            onChangeText={setRenameValue}
                            autoFocus
                            onSubmitEditing={handleConfirmRename}
                            returnKeyType="done"
                            placeholderTextColor="#4B5563"
                        />
                        <View style={styles.renameButtons}>
                            <TouchableOpacity style={styles.renameCancelBtn} onPress={handleCancelRename}>
                                <Text style={styles.renameCancelText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.renameConfirmBtn, !renameValue.trim() && { opacity: 0.5 }]}
                                onPress={handleConfirmRename}
                                disabled={!renameValue.trim()}
                            >
                                <Text style={styles.renameConfirmText}>{t('confirm')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', maxWidth: 500, width: '88%', maxHeight: '92%' },
    content: { flex: 1, padding: 24, backgroundColor: 'rgba(15,15,20,0.85)' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    createSection: { flexDirection: 'row', gap: 8, marginBottom: 16 },
    createInput: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#E5E7EB', fontSize: 14,
    },
    createBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(245,158,11,0.2)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    },
    createBtnDisabled: { backgroundColor: 'rgba(0,0,0,0.2)', borderColor: 'rgba(255,255,255,0.05)' },
    createBtnText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
    scroll: { flex: 1 },
    emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
    emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' },
    emptySubtext: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center' },
    itineraryCard: {
        backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: 'rgba(245,158,11,0.1)',
    },
    itineraryHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    itineraryIcon: {
        width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center',
        backgroundColor: 'rgba(245,158,11,0.12)',
    },
    itineraryInfo: { flex: 1 },
    itineraryName: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
    itineraryMeta: { color: '#6B7280', fontSize: 11, marginTop: 2 },
    actionBtn: { padding: 6 },
    tripList: { marginTop: 10, marginLeft: 18, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: 'rgba(245,158,11,0.2)' },
    tripItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative' },
    tripDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B',
        position: 'absolute', left: -17,
    },
    tripLine: {},
    tripItemText: { color: '#9CA3AF', fontSize: 12 },
    // Rename modal
    renameOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    renameCard: {
        backgroundColor: 'rgba(20,20,30,0.95)', borderRadius: 20, padding: 24, width: '80%', maxWidth: 400,
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    },
    renameTitle: { color: '#F0F0F0', fontSize: 17, fontWeight: '700', marginBottom: 16 },
    renameInput: {
        backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#E5E7EB', fontSize: 15,
        marginBottom: 20,
    },
    renameButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
    renameCancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    renameCancelText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
    renameConfirmBtn: {
        backgroundColor: 'rgba(0,212,255,0.15)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.3)',
        borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10,
    },
    renameConfirmText: { color: '#00d4ff', fontSize: 14, fontWeight: '600' },
});

export default ItineraryManager;
