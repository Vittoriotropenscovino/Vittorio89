/**
 * TripSidebar - Hidden drawer menu for trip list
 */

import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';

interface TripSidebarProps {
    trips: Trip[];
    visible: boolean;
    onClose: () => void;
    onTripSelect: (trip: Trip) => void;
    onTripView: (trip: Trip) => void;
    onDelete: (tripId: string) => void;
}

const SIDEBAR_WIDTH = 280;

const TripSidebar: React.FC<TripSidebarProps> = ({
    trips,
    visible,
    onClose,
    onTripSelect,
    onTripView,
    onDelete,
}) => {
    const slideAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [shouldRender, setShouldRender] = useState(visible);

    useEffect(() => {
        if (visible) {
            setShouldRender(true);
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 11,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -SIDEBAR_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start(() => setShouldRender(false));
        }
    }, [visible, slideAnim, fadeAnim]);


    const handleDeleteRequest = (trip: Trip) => {
        Alert.alert(
            'Elimina Viaggio',
            `Sei sicuro di voler eliminare "${trip.title}"?`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: () => onDelete(trip.id)
                }
            ]
        );
    }

    if (!shouldRender) {
        return null;
    }

    return (
        <>
            {/* Backdrop overlay */}
            <Animated.View
                style={[styles.backdrop, { opacity: fadeAnim }]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    activeOpacity={1}
                />
            </Animated.View>

            {/* Sidebar */}
            <Animated.View
                style={[
                    styles.sidebar,
                    { transform: [{ translateX: slideAnim }] },
                ]}
            >
                <BlurView intensity={80} style={styles.sidebarContent} tint="dark">
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>I Miei Viaggi</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    {/* Trip count */}
                    <View style={styles.countContainer}>
                        <Ionicons name="airplane" size={16} color="#60A5FA" />
                        <Text style={styles.countText}>
                            {trips.length} {trips.length === 1 ? 'viaggio' : 'viaggi'} salvati
                        </Text>
                    </View>

                    {/* Trip list */}
                    <ScrollView style={styles.tripList} showsVerticalScrollIndicator={false}>
                        {trips.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="globe-outline" size={48} color="#4B5563" />
                                <Text style={styles.emptyText}>Nessun viaggio ancora</Text>
                                <Text style={styles.emptySubtext}>
                                    Aggiungi il tuo primo viaggio!
                                </Text>
                            </View>
                        ) : (
                            trips.map((trip) => (
                                <TouchableOpacity
                                    key={trip.id}
                                    style={styles.tripItem}
                                    onPress={() => {
                                        onTripSelect(trip);
                                        onClose();
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.tripItemContent}>
                                        <View style={styles.tripInfo}>
                                            <Text style={styles.tripTitle} numberOfLines={1}>
                                                {trip.title}
                                            </Text>
                                            <Text style={styles.tripLocation} numberOfLines={1}>
                                                <Ionicons name="location" size={12} color="#9CA3AF" />{' '}
                                                {trip.locationName}
                                            </Text>
                                            <Text style={styles.tripDate}>
                                                {trip.date}
                                            </Text>
                                        </View>
                                        <View style={styles.tripActions}>
                                            <TouchableOpacity
                                                style={styles.viewButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    onTripView(trip);
                                                }}
                                            >
                                                <Ionicons name="eye" size={18} color="#60A5FA" />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.deleteButton}
                                                onPress={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteRequest(trip);
                                                }}
                                            >
                                                <Ionicons name="trash-outline" size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </ScrollView>
                </BlurView>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 100,
    },
    sidebar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: SIDEBAR_WIDTH,
        zIndex: 101,
    },
    sidebarContent: {
        flex: 1,
        borderRightWidth: 1,
        borderRightColor: 'rgba(255, 255, 255, 0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#F9FAFB',
    },
    closeButton: {
        padding: 4,
    },
    countContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
    },
    countText: {
        color: '#9CA3AF',
        fontSize: 13,
    },
    tripList: {
        flex: 1,
        paddingHorizontal: 12,
        paddingTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: '#6B7280',
        fontSize: 16,
        fontWeight: '500',
        marginTop: 16,
    },
    emptySubtext: {
        color: '#4B5563',
        fontSize: 13,
        marginTop: 4,
    },
    tripItem: {
        marginBottom: 8,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
    },
    tripItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    tripInfo: {
        flex: 1,
    },
    tripTitle: {
        color: '#F9FAFB',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    tripLocation: {
        color: '#9CA3AF',
        fontSize: 12,
        marginBottom: 2,
    },
    tripDate: {
        color: '#6B7280',
        fontSize: 11,
    },
    tripActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    viewButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
    },
    deleteButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
    },
});

export default TripSidebar;

