/**
 * TripSidebar - Hidden drawer menu for trip list, grouped by country
 */

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Alert,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { getCountryFlag } from '../utils/countryFlags';

interface TripSidebarProps {
    trips: Trip[];
    visible: boolean;
    onClose: () => void;
    onTripSelect: (trip: Trip) => void;
    onTripView: (trip: Trip) => void;
    onDelete: (tripId: string) => void;
}

interface CountryGroup {
    country: string;
    countryCode?: string;
    trips: Trip[];
}

const SIDEBAR_WIDTH = 300;

const groupTripsByCountry = (trips: Trip[]): CountryGroup[] => {
    const grouped: Record<string, { countryCode?: string; trips: Trip[] }> = {};

    for (const trip of trips) {
        const country = trip.country || extractCountry(trip.locationName);
        if (!grouped[country]) {
            grouped[country] = { countryCode: trip.countryCode, trips: [] };
        }
        grouped[country].trips.push(trip);
    }

    return Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([country, data]) => ({
            country,
            countryCode: data.countryCode,
            trips: data.trips.sort((a, b) => a.date.localeCompare(b.date)),
        }));
};

const extractCountry = (locationName: string): string => {
    const parts = locationName.split(',').map(s => s.trim());
    return parts[parts.length - 1] || 'Sconosciuto';
};

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
    const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());

    const countryGroups = useMemo(() => groupTripsByCountry(trips), [trips]);

    // Auto-expand all countries when there are few
    useEffect(() => {
        if (countryGroups.length <= 3) {
            setExpandedCountries(new Set(countryGroups.map(g => g.country)));
        }
    }, [countryGroups]);

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

    const toggleCountry = (country: string) => {
        setExpandedCountries(prev => {
            const next = new Set(prev);
            if (next.has(country)) next.delete(country);
            else next.add(country);
            return next;
        });
    };

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
    };

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
                        {countryGroups.length > 0 && (
                            <Text style={styles.countCountries}>
                                {countryGroups.length} {countryGroups.length === 1 ? 'paese' : 'paesi'}
                            </Text>
                        )}
                    </View>

                    {/* Trip list grouped by country */}
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
                            countryGroups.map((group) => {
                                const isExpanded = expandedCountries.has(group.country);
                                return (
                                    <View key={group.country} style={styles.countrySection}>
                                        {/* Country Header */}
                                        <TouchableOpacity
                                            style={styles.countryHeader}
                                            onPress={() => toggleCountry(group.country)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.countryFlag}>
                                                {getCountryFlag(group.countryCode)}
                                            </Text>
                                            <Text style={styles.countryName} numberOfLines={1}>
                                                {group.country}
                                            </Text>
                                            <View style={styles.countryBadge}>
                                                <Text style={styles.countryBadgeText}>
                                                    {group.trips.length}
                                                </Text>
                                            </View>
                                            <Ionicons
                                                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                                size={16}
                                                color="#6B7280"
                                            />
                                        </TouchableOpacity>

                                        {/* Expanded trip list */}
                                        {isExpanded && group.trips.map((trip) => (
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
                                                            <Ionicons name="location" size={11} color="#9CA3AF" />{' '}
                                                            {trip.locationName.split(',')[0]}
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
                                                            <Ionicons name="eye" size={16} color="#60A5FA" />
                                                        </TouchableOpacity>
                                                        <TouchableOpacity
                                                            style={styles.deleteButton}
                                                            onPress={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteRequest(trip);
                                                            }}
                                                        >
                                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                );
                            })
                        )}
                        {/* Bottom padding for safe scrolling */}
                        <View style={{ height: 40 }} />
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
        flex: 1,
    },
    countCountries: {
        color: '#60A5FA',
        fontSize: 12,
        fontWeight: '500',
    },
    tripList: {
        flex: 1,
        paddingTop: 4,
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
    // Country grouping
    countrySection: {
        marginBottom: 2,
    },
    countryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    countryFlag: {
        fontSize: 20,
    },
    countryName: {
        flex: 1,
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '600',
    },
    countryBadge: {
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countryBadgeText: {
        color: '#60A5FA',
        fontSize: 12,
        fontWeight: '600',
    },
    // Trip items (indented under country)
    tripItem: {
        marginLeft: 16,
        marginRight: 8,
        marginBottom: 4,
        marginTop: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        overflow: 'hidden',
    },
    tripItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    tripInfo: {
        flex: 1,
    },
    tripTitle: {
        color: '#F9FAFB',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 3,
    },
    tripLocation: {
        color: '#9CA3AF',
        fontSize: 11,
        marginBottom: 2,
    },
    tripDate: {
        color: '#6B7280',
        fontSize: 11,
    },
    tripActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
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
