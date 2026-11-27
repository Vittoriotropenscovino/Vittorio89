import React, { useRef, useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated, SectionList, ScrollView,
    TextInput, Platform, useWindowDimensions, PixelRatio,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Trip, TripTag, TAG_CONFIG, HomeLocation } from '../types';
import { useApp } from '../contexts/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCountryFlag } from '../utils/countryFlags';
import { fitFontSize } from '../utils/fitText';
import { extractCountryFromLocationName } from '../utils/geocoding';
import { formatTripDate } from '../utils/formatDate';

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
    // "Cast to TV" (Android only): moved here from the top bar in 1.4.0
    onCastScreen?: () => void;
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
    onToggleFavorite, onOpenSettings, onOpenStats, onOpenCalendar, onOpenHelpGuide, onCastScreen, homeLocation,
}) => {
    const { t, language } = useApp();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    // 1.4.0: portrait 86% of the screen. Landscape: two panes side by side (the
    // buttons and filters on the left, the trips on the right), so the trips are
    // visible at once instead of under six buttons (phone test 22/11).
    const landscape = screenWidth > screenHeight;
    const sidebarWidth = landscape ? Math.min(screenWidth * 0.84, 760) : Math.min(screenWidth * 0.86, 420);
    // The quick actions: 2 per row (3 in the landscape left pane), widths in
    // numbers, recomputed at every rotation. A '47%' basis plus
    // adjustsFontSizeToFit kept the sizes measured before the rotation and fell
    // to one per row (6 rows over the trip list).
    const quickCols = landscape ? 3 : 2;
    // landscape: 55% buttons, 45% trips (with 60/40 the country names were cut,
    // "Giapp…", with a 115% system font)
    const controlsWidth = landscape ? Math.round(sidebarWidth * 0.55) : sidebarWidth - (16 + insets.left) - 16 - 1;
    const quickW = Math.floor((controlsWidth - QUICK_GAP * (quickCols - 1)) / quickCols);
    // Quick-action labels: size computed from the room (icon 16 + gap 6 + 12 margin),
    // not adjustsFontSizeToFit, which clipped words on Android with a large system font.
    const fontScale = PixelRatio.getFontScale();
    const qFont = (label: string) => fitFontSize(label, quickW - 16 - 6 - 12, 12, 9, fontScale);
    // Country headers in the trip list: name sized from the room left by the flag, the
    // gold count and the arrow (landscape at 130% showed "Portogall…").
    // the list width is MEASURED: the estimate from the screen width was 70 points too
    // wide in landscape (system bars at the side)
    const [listPaneW, setListPaneW] = useState(0);
    const listW = (landscape ? listPaneW : 0) || (landscape ? sidebarWidth - controlsWidth - 48 : controlsWidth);
    const sectionRoom = listW - 2 * 12 - 2 - 22 * fontScale - 3 * 8 - (16 + 14 * fontScale) - 16;
    const sectionFont = (title: string) => fitFontSize(title, sectionRoom, 14, 11, fontScale);
    // the home button can say «Imposta la posizione di casa»: too long for one line, so
    // two lines at 11 instead of an ellipsis
    const homeLabel = (homeLocation ? homeLocation.name.split(',')[0] : t('setHomeLocation')) as string;
    const homeOneLine = fitFontSize(homeLabel, quickW - 16 - 6 - 12, 12, 1, fontScale) >= 10;
    const homeLabelLines = homeOneLine ? 1 : 2;
    const homeTwoLineSize = fitFontSize(homeLabel, (quickW - 16 - 6 - 12) * 1.8, 11, 9, fontScale);
    const homeLabelStyle = homeOneLine ? { fontSize: qFont(homeLabel) } : { fontSize: homeTwoLineSize, lineHeight: Math.round(homeTwoLineSize * 1.3) };
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
            // start fully hidden at the CURRENT width (it changes with the rotation)
            slideAnim.setValue(-sidebarWidth);
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
                <TouchableOpacity style={styles.favBtn} onPress={() => handleFavorite(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button" accessibilityLabel={t('favorite') as string} accessibilityState={{ selected: !!item.isFavorite }}>
                    <Ionicons name={item.isFavorite ? 'heart' : 'heart-outline'} size={18} color={item.isFavorite ? '#F43F5E' : '#4B5563'} />
                    {item.isFavorite && <Text style={styles.favText}>{t('favorite')}</Text>}
                </TouchableOpacity>
            </View>
            <View style={styles.tripCardFooter}>
                {item.date && (
                    <View style={styles.dateBadge}>
                        <Ionicons name="calendar-outline" size={10} color="#9CA3AF" />
                        <Text style={styles.dateText}>{formatTripDate(item.date, language)}</Text>
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
                <Text style={[styles.sectionTitle, { fontSize: sectionFont(section.title) }]} numberOfLines={1}>{section.title}</Text>
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

    // Buttons, search, sort and tag filters; then the trips. Portrait: one column.
    // Landscape: two panes (see sidebarWidth).
    const controls = (
        <>
            <View key={`qa-${quickW}`} style={styles.quickActions}>
                {onOpenSettings && (
                    <TouchableOpacity
                        style={[styles.quickActionBtn, { width: quickW }, landscape && styles.quickActionCompact, homeLocation ? styles.homeActionSet : styles.homeActionUnset]}
                        onPress={() => { onOpenSettings(); onClose(); }}>
                        <Ionicons name="home" size={16} color="#FFD700" />
                        <Text style={[styles.quickActionText, homeLabelStyle]} numberOfLines={homeLabelLines}>
                            {homeLocation ? homeLocation.name.split(',')[0] : t('setHomeLocation')}
                        </Text>
                    </TouchableOpacity>
                )}
                {onOpenStats && (
                    <TouchableOpacity testID="quick-stats" style={[styles.quickActionBtn, { width: quickW }, landscape && styles.quickActionCompact]} onPress={() => { onOpenStats(); onClose(); }}>
                        <Ionicons name="stats-chart" size={16} color="#00d4ff" />
                        <Text style={[styles.quickActionText, { fontSize: qFont(t('statistics') as string) }]} numberOfLines={1}>{t('statistics')}</Text>
                    </TouchableOpacity>
                )}
                {onOpenCalendar && (
                    <TouchableOpacity testID="quick-calendar" style={[styles.quickActionBtn, { width: quickW }, landscape && styles.quickActionCompact]} onPress={() => { onOpenCalendar(); onClose(); }}>
                        <Ionicons name="calendar" size={16} color="#00d4ff" />
                        <Text style={[styles.quickActionText, { fontSize: qFont(t('calendar') as string) }]} numberOfLines={1}>{t('calendar')}</Text>
                    </TouchableOpacity>
                )}
                {onOpenSettings && (
                    <TouchableOpacity testID="quick-settings" style={[styles.quickActionBtn, { width: quickW }, landscape && styles.quickActionCompact]} onPress={() => { onOpenSettings(); onClose(); }}>
                        <Ionicons name="settings" size={16} color="#00d4ff" />
                        <Text style={[styles.quickActionText, { fontSize: qFont(t('settings') as string) }]} numberOfLines={1}>{t('settings')}</Text>
                    </TouchableOpacity>
                )}
                {onOpenHelpGuide && (
                    <TouchableOpacity testID="quick-help" style={[styles.quickActionBtn, { width: quickW }, landscape && styles.quickActionCompact]} onPress={() => { onOpenHelpGuide(); onClose(); }}>
                        <Ionicons name="help-circle" size={16} color="#00d4ff" />
                        <Text style={[styles.quickActionText, { fontSize: qFont(t('helpGuideMenuItem') as string) }]} numberOfLines={1}>{t('helpGuideMenuItem')}</Text>
                    </TouchableOpacity>
                )}
                {onCastScreen && (
                    <TouchableOpacity testID="cast-tv" style={[styles.quickActionBtn, { width: quickW }, landscape && styles.quickActionCompact]} onPress={() => { onCastScreen(); onClose(); }}>
                        <Ionicons name="tv-outline" size={16} color="#00d4ff" />
                        <Text style={[styles.quickActionText, { fontSize: qFont(t('castToTv') as string) }]} numberOfLines={1}>{t('castToTv')}</Text>
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
                        <Text style={[styles.tagFilterText, filterTag === tag && { color: TAG_CONFIG[tag].color }]}>{t(tag as any)}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </>
    );

    const tripList = sortMode === 'country' && countrySections.length > 0 ? (
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
    );

    return (
        <>
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity, ...Platform.select({ android: { elevation: 100 } }) }]}>
                <TouchableOpacity style={styles.backdropTouch} onPress={onClose} activeOpacity={1} />
            </Animated.View>
            <Animated.View style={[styles.sidebar, { width: sidebarWidth, transform: [{ translateX: slideAnim }], ...Platform.select({ android: { elevation: 101 } }) }]}>
                <BlurView intensity={80} style={styles.sidebarBlur} tint="dark">
                    <View style={[styles.sidebarContent, { paddingTop: 16 + insets.top, paddingBottom: 16 + insets.bottom, paddingLeft: 16 + insets.left }]}>
                        <View style={styles.sidebarHeader}>
                            <Text style={styles.sidebarTitle}>{t('myTrips')}</Text>
                            <TouchableOpacity testID="sidebar-close" style={styles.closeBtnSidebar} onPress={onClose} accessibilityRole="button">
                                <Ionicons name="close" size={18} color="#fff" />
                                <Text style={styles.closeText}>{t('close')}</Text>
                            </TouchableOpacity>
                        </View>
                        {landscape ? (
                            <View style={styles.twoPane}>
                                <ScrollView style={{ width: controlsWidth, flexGrow: 0 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                                    {controls}
                                </ScrollView>
                                <View style={styles.listPane} onLayout={(e) => setListPaneW(e.nativeEvent.layout.width)}>{tripList}</View>
                            </View>
                        ) : (
                            <>
                                {controls}
                                {tripList}
                            </>
                        )}
                    </View>
                </BlurView>
            </Animated.View>
        </>
    );
};

const QUICK_GAP = 8;

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50 },
    backdropTouch: { flex: 1 },
    sidebar: { position: 'absolute', top: 0, left: 0, bottom: 0, zIndex: 51 },
    sidebarBlur: { flex: 1, borderRightWidth: 1, borderRightColor: 'rgba(0,212,255,0.1)' },
    sidebarContent: { flex: 1, padding: 16, backgroundColor: 'rgba(10,10,20,0.98)' },
    sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    closeBtnSidebar: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    closeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    favBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    favText: { color: '#F43F5E', fontSize: 11, fontWeight: '700' },
    sidebarTitle: { fontSize: 20, fontWeight: '800', color: '#F0F0F0' },
    // 2 per row (1.4.0): six actions, each with its whole label; width set in numbers
    quickActions: { flexDirection: 'row', flexWrap: 'wrap', gap: QUICK_GAP, marginBottom: 14 },
    quickActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(0,212,255,0.06)', borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)', borderRadius: 10, paddingVertical: 8 },
    quickActionText: { color: '#9CA3AF', fontSize: 12, fontWeight: '500', flexShrink: 1 },
    quickActionCompact: { paddingVertical: 6 },
    twoPane: { flex: 1, flexDirection: 'row', gap: 16 },
    listPane: { flex: 1 },
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
    tagFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.2)' },
    tagFilterActive: { borderColor: 'rgba(0,212,255,0.3)', backgroundColor: 'rgba(0,212,255,0.08)' },
    tagFilterText: { color: '#6B7280', fontSize: 10, fontWeight: '500' },
    tagFilterTextActive: { color: '#00d4ff' },
    tripList: { flex: 1 },
    tripCard: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
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
    // a country you have been to: gold, like everything "visited" (1.4.0)
    sectionBadge: { backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
    sectionCount: { color: '#FBBF24', fontSize: 11, fontWeight: '700' },
    emptyState: { alignItems: 'center', paddingTop: 40, gap: 8 },
    emptyTitle: { color: 'rgba(255,255,255,0.4)', fontSize: 15, fontWeight: '600' },
    emptySubtext: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center' },
});

export default TripSidebar;
