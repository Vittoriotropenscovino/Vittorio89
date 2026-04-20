import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, SectionList,
    TextInput, Platform, useWindowDimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, TripTag, TAG_CONFIG, HomeLocation } from '../types';
import { useApp } from '../contexts/AppContext';
import { getCountryFlag } from '../utils/countryFlags';
import { extractCountryFromLocationName } from '../utils/geocoding';

type SortMode = 'recent' | 'date' | 'name' | 'favorites' | 'country';

interface Props {
    trips: Trip[];
    visible: boolean;
    onClose: () => void;
    onTripSelect: (trip: Trip) => void;
    onDelete: (tripId: string) => void;
    onToggleFavorite?: (tripId: string) => void;
    onOpenSettings?: () => void;
    onOpenStats?: () => void;
    onOpenCalendar?: () => void;
    onOpenHelpGuide?: () => void;
    homeLocation?: HomeLocation | null;
}

interface CountrySection {
    title: string;
    flag: string;
    countryCode: string;
    data: Trip[];
}

const TripSidebar: React.FC<Props> = ({
    trips, visible, onClose, onTripSelect, onDelete,
    onToggleFavorite, onOpenSettings, onOpenStats, onOpenCalendar, onOpenHelpGuide, homeLocation,
}) => {
    const { t } = useApp();
    const { width: screenWidth } = useWindowDimensions();
    const sidebarWidth = Math.min(screenWidth * 0.78, 420);
    const slideAnim = useRef(new Animated.Value(-sidebarWidth)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const [isRendered, setIsRendered] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortMode, setSortMode] = useState<SortMode>('country');
    const [filterTag, setFilterTag] = useState<TripTag | null>(null);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (visible) {
            setIsRendered(true);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: -sidebarWidth, duration: 250, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start(() => { setIsRendered(false); setSearchQuery(''); });
        }
    }, [visible, slideAnim, backdropOpacity]);

    const filteredTrips = useMemo(() => {
        let result = [...trips];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter((tr) =>
                tr.title.toLowerCase().includes(q) || tr.locationName.toLowerCase().includes(q)
                || (tr.country && tr.country.toLowerCase().includes(q))
            );
        }
        if (filterTag) {
            result = result.filter((tr) => tr.tags?.includes(filterTag));
        }
        switch (sortMode) {
            case 'recent': result.sort((a, b) => b.createdAt - a.createdAt); break;
            case 'date': result.sort((a, b) => b.date.localeCompare(a.date)); break;
            case 'name': result.sort((a, b) => a.title.localeCompare(b.title)); break;
            case 'favorites': result.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0)); break;
            case 'country': result.sort((a, b) => (a.country || '').localeCompare(b.country || '')); break;
        }
        return result;
    }, [trips, searchQuery, sortMode, filterTag]);

    const countrySections = useMemo((): CountrySection[] => {
        if (sortMode !== 'country') return [];
        const groupMap = new Map<string, Trip[]>();
        filteredTrips.forEach((trip) => {
            const country = trip.country || extractCountryFromLocationName(trip.locationName);
            if (!groupMap.has(country)) groupMap.set(country, []);
            groupMap.get(country)!.push(trip);
        });
        const sections: CountrySection[] = [];
        groupMap.forEach((data, title) => {
            const cc = data[0]?.countryCode || '';
            sections.push({ title, flag: getCountryFlag(cc), countryCode: cc, data });
        });
        sections.sort((a, b) => a.title.localeCompare(b.title));
        return sections;
    }, [filteredTrips, sortMode]);

    const toggleSection = (title: string) => {
        setCollapsedSections((prev) => {
            const next = new Set(prev);
            if (next.has(title)) next.delete(title);
            else next.add(title);
            return next;
        });
    };

    if (!isRendered) return null;

    const handleFavorite = (tripId: string) => {
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onToggleFavorite?.(tripId);
    };

    const renderTrip = ({ item }: { item: Trip }) => (
        <TouchableOpacity style={styles.tripCard} onPress={() => { onTripSelect(item); onClose(); }} activeOpacity={0.7}>
            <View style={styles.tripCardHeader}>
                <View style={styles.tripCardInfo}>
                    <Text style={styles.tripTitle} numberOfLines={1}>{item.title}</Text>
                    <View style={styles.tripMeta}>
                        <Ionicons name="location" size={12} color="#60A5FA" />
                        <Text style={styles.tripLocation} numberOfLines={1}>{item.locationName.split(',')[0]}</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => handleFavorite(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name={item.isFavorite ? 'heart' : 'heart-outline'} size={18} color={item.isFavorite ? '#F43F5E' : '#4B5563'} />
                </TouchableOpacity>
            </View>
            <View style={styles.tripCardFooter}>
                {item.date && (
                    <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={10} color="#9CA3AF" />
                        <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                )}
                {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagBadges}>
                        {item.tags.slice(0, 3).map((tag) => (
                            <View key={tag} style={[styles.miniTag, { backgroundColor: TAG_CONFIG[tag].color + '20' }]}>
                                <Ionicons name={TAG_CONFIG[tag].icon as any} size={10} color={TAG_CONFIG[tag].color} />
                            </View>
                        ))}
                    </View>
                )}
                {item.media.length > 0 && (
                    <View style={styles.mediaBadge}>
                        <Ionicons name="images-outline" size={10} color="#9CA3AF" />
                        <Text style={styles.mediaCount}>{item.media.length}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderSectionHeader = ({ section }: { section: CountrySection & { realCount?: number } }) => {
        const isCollapsed = collapsedSections.has(section.title);
        const count = section.realCount ?? section.data.length;
        return (
            <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection(section.title)} activeOpacity={0.7}>
                <Text style={styles.sectionFlag}>{section.flag}</Text>
                <Text style={styles.sectionTitle} numberOfLines={1}>{section.title}</Text>
                <View style={styles.sectionBadge}>
                    <Text style={styles.sectionCount}>{count}</Text>
                </View>
                <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={16} color="#6B7280" />
            </TouchableOpacity>
        );
    };

    const sortButtons: { mode: SortMode; label: string; icon: string }[] = [
        { mode: 'country', label: t('groupByCountry') as string, icon: 'flag-outline' },
        { mode: 'recent', label: t('recent') as string, icon: 'time-outline' },
        { mode: 'name', label: t('byName') as string, icon: 'text-outline' },
        { mode: 'favorites', label: t('byFavorites') as string, icon: 'heart-outline' },
    ];

    const allTags: TripTag[] = ['sea', 'mountain', 'city', 'adventure', 'culture', 'food', 'nature', 'romantic'];

    const emptyComponent = (
        <View style={styles.emptyState}>
            <Ionicons name="airplane-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyTitle}>{searchQuery || filterTag ? t('noResults') : t('noTripsYet')}</Text>
            <Text style={styles.emptySubtext}>{searchQuery || filterTag ? t('tryDifferent') : t('addFirstTrip')}</Text>
        </View>
    );

    return (
        <>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, ...Platform.select({ android: { elevation: 100 } }) }]}>
                <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
            </Animated.View>
            <Animated.View style={[styles.sidebar, { width: sidebarWidth, transform: [{ translateX: slideAnim }], ...Platform.select({ android: { elevation: 101 } }) }]}>
                <BlurView intensity={80} style={styles.sidebarBlur} tint="dark">
                    <View style={styles.sidebarContent}>
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>{t('myTrips')}</Text>
                            <TouchableOpacity style={styles.closeBtnSidebar} onPress={onClose}>
                                <Ionicons name="close" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.quickActions}>
                            {onOpenSettings && (
                                <TouchableOpacity
                                    style={[styles.quickActionBtn, homeLocation ? styles.homeActionSet : styles.homeActionUnset]}
                                    onPress={() => { onOpenSettings(); onClose(); }}>
                                    <Ionicons name="home" size={16} color="#FFD700" />
                                    <Text style={styles.quickActionText} numberOfLines={1}>
                                        {homeLocation ? homeLocation.name.split(',')[0] : t('setHomeLocation')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                            {onOpenStats && (
                                <TouchableOpacity style={styles.quickActionBtn} onPress={() => { onOpenStats(); onClose(); }}>
                                    <Ionicons name="stats-chart" size={16} color="#00d4ff" />
                                    <Text style={styles.quickActionText}>{t('statistics')}</Text>
                                </TouchableOpacity>
                            )}
                            {onOpenCalendar && (
                                <TouchableOpacity style={styles.quickActionBtn} onPress={() => { onOpenCalendar(); onClose(); }}>
                                    <Ionicons name="calendar" size={16} color="#00d4ff" />
                                    <Text style={styles.quickActionText}>{t('calendar')}</Text>
                                </TouchableOpacity>
                            )}
                            {onOpenSettings && (
                                <TouchableOpacity style={styles.quickActionBtn} onPress={() => { onOpenSettings(); onClose(); }}>
                                    <Ionicons name="settings" size={16} color="#00d4ff" />
                                    <Text style={styles.quickActionText}>{t('settings')}</Text>
                                </TouchableOpacity>
                            )}
                            {onOpenHelpGuide && (
                                <TouchableOpacity style={styles.quickActionBtn} onPress={() => { onOpenHelpGuide(); onClose(); }}>
                                    <Ionicons name="help-circle" size={16} color="#00d4ff" />
                                    <Text style={styles.quickActionText}>{t('helpGuideMenuItem')}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.searchContainer}>
                            <Ionicons name="search" size={16} color="#6B7280" />
                            <TextInput style={styles.searchInput} placeholder={t('searchTrips') as string}
                                placeholderTextColor="#6B7280" value={searchQuery} onChangeText={setSearchQuery} />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color="#6B7280" /></TouchableOpacity>
                            )}
                        </View>
                        <View style={styles.sortRow}>
                            {sortButtons.map((btn) => (
                                <TouchableOpacity key={btn.mode} style={[styles.sortBtn, sortMode === btn.mode && styles.sortBtnActive]}
                                    onPress={() => setSortMode(btn.mode)}>
                                    <Ionicons name={btn.icon as any} size={12} color={sortMode === btn.mode ? '#00d4ff' : '#6B7280'} />
                                    <Text style={[styles.sortText, sortMode === btn.mode && styles.sortTextActive]}>{btn.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.tagFilterRow}>
                            <TouchableOpacity style={[styles.tagFilterChip, !filterTag && styles.tagFilterActive]}
                                onPress={() => setFilterTag(null)}>
                                <Text style={[styles.tagFilterText, !filterTag && styles.tagFilterTextActive]}>{t('all')}</Text>
                            </TouchableOpacity>
                            {allTags.map((tag) => (
                                <TouchableOpacity key={tag}
                                    style={[styles.tagFilterChip, filterTag === tag && { borderColor: TAG_CONFIG[tag].color, backgroundColor: TAG_CONFIG[tag].color + '15' }]}
                                    onPress={() => setFilterTag(filterTag === tag ? null : tag)}>
                                    <Ionicons name={TAG_CONFIG[tag].icon as any} size={12} color={filterTag === tag ? TAG_CONFIG[tag].color : '#6B7280'} />
                                </TouchableOpacity>
                            ))}
                        </View>

                        {sortMode === 'country' && countrySections.length > 0 ? (
                            <SectionList
                                sections={countrySections.map(section => ({
                                    ...section,
                                    realCount: section.data.length,
                                    data: collapsedSections.has(section.title) ? [] : section.data,
                                }))}
                                renderItem={renderTrip}
                                renderSectionHeader={renderSectionHeader}
                                keyExtractor={(item) => item.id}
                                style={styles.tripList}
                                showsVerticalScrollIndicator={false}
                                stickySectionHeadersEnabled={false}
                                ListEmptyComponent={emptyComponent}
                            />
                        ) : (
                            <SectionList
                                sections={filteredTrips.length > 0 ? [{ title: '', data: filteredTrips }] : []}
                                renderItem={renderTrip}
                                renderSectionHeader={() => null}
                                keyExtractor={(item) => item.id}
                                style={styles.tripList}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={emptyComponent}
                            />
                        )}
                    </View>
                </BlurView>
            </Animated.View>
        </>
    );
};

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50 },
    backdropTouch: { flex: 1 },
    sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 51 },
    sidebarBlur: { flex: 1, borderRightWidth: 1, borderRightColor: 'rgba(0,212,255,0.1)' },
    sidebarContent: { flex: 1, padding: 16, backgroundColor: 'rgba(10,10,20,0.98)' },
    sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    closeBtnSidebar: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    sidebarTitle: { fontSize: 20, fontWeight: '800', color: '#F0F0F0' },
    quickActions: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    quickActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)', borderRadius: 10, paddingVertical: 8 },
    quickActionText: { color: '#9CA3AF', fontSize: 10, fontWeight: '500', flexShrink: 1 },
    homeActionSet: { borderColor: 'rgba(255,215,0,0.2)', backgroundColor: 'rgba(255,215,0,0.06)' },
    homeActionUnset: { borderColor: 'rgba(255,215,0,0.15)', backgroundColor: 'rgba(255,215,0,0.04)' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8, marginBottom: 10 },
    searchInput: { flex: 1, color: '#fff', fontSize: 13, padding: 0 },
    sortRow: { flexDirection: 'row', gap: 4, marginBottom: 8 },
    sortBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.2)' },
    sortBtnActive: { backgroundColor: 'rgba(0,212,255,0.1)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)' },
    sortText: { color: '#6B7280', fontSize: 9, fontWeight: '500' },
    sortTextActive: { color: '#00d4ff' },
    tagFilterRow: { flexDirection: 'row', gap: 4, marginBottom: 12, flexWrap: 'wrap' },
    tagFilterChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' },
    tagFilterActive: { borderColor: 'rgba(0,212,255,0.3)', backgroundColor: 'rgba(0,212,255,0.08)' },
    tagFilterText: { color: '#6B7280', fontSize: 10, fontWeight: '500' },
    tagFilterTextActive: { color: '#00d4ff' },
    tripList: { flex: 1 },
    tripCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tripCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    tripCardInfo: { flex: 1, marginRight: 8 },
    tripTitle: { color: '#E5E7EB', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    tripLocation: { color: '#9CA3AF', fontSize: 11 },
    tripCardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dateText: { color: '#6B7280', fontSize: 10 },
    tagBadges: { flexDirection: 'row', gap: 3 },
    miniTag: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    mediaBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
    mediaCount: { color: '#6B7280', fontSize: 10 },
    // Section header styles for country grouping
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)',
        borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 8,
    },
    sectionFlag: { fontSize: 18 },
    sectionTitle: { flex: 1, color: '#E5E7EB', fontSize: 14, fontWeight: '700' },
    sectionBadge: { backgroundColor: 'rgba(0,212,255,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    sectionCount: { color: '#00d4ff', fontSize: 11, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
    emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' },
    emptySubtext: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center' },
});

export default TripSidebar;
