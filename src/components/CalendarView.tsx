import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, useWindowDimensions, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { useApp } from '../contexts/AppContext';
import { ALL_ORIENTATIONS } from '../hooks/useOrientation';
import { MODAL_BACKDROP, MODAL_CARD } from '../utils/surfaces';
import { calendarCellSize, weekdayLetters, CALENDAR_CELLS, landscapeRowHeight } from '../utils/calendarGrid';
import { fitFontSize, estimateTextWidth } from '../utils/fitText';

// gold = "visited": the days with a trip, as on the main screen
const GOLD = '#FBBF24';

interface Props {
    visible: boolean;
    onClose: () => void;
    trips: Trip[];
    onTripSelect: (trip: Trip) => void;
}

const CalendarView: React.FC<Props> = ({ visible, onClose, trips, onTripSelect }) => {
    const { t, language } = useApp();
    // Landscape phones are short: the card never gets taller than the screen
    // (it used to run off the bottom) and the day cells are lower, so the whole
    // month fits; the trips of the month scroll inside the card.
    const { width: winW, height: winH } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const landscape = winW > winH;
    const maxCardHeight = winH - insets.top - insets.bottom - 24;
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const months = t('months') as string[];
    // Straight columns: one whole-point column width, measured, for the weekday
    // row and the days (src/utils/calendarGrid.ts).
    const [gridW, setGridW] = useState(0);
    const cell = calendarCellSize(gridW);
    // portrait: square cells; landscape: low cells so the month fits (1.3.0)
    // ...but all 6 weeks in sight: the room under header, month and weekday letters is measured
    const [topH, setTopH] = useState(0);
    const gridRoom = topH > 0 ? maxCardHeight - 2 * 12 - 2 - topH : 0;
    const cellH = landscape ? landscapeRowHeight(cell, gridRoom) : cell;
    // portrait: as wide as the screen minus the margins
    const cardWidth = landscape ? undefined : Math.min(winW - 32, 500);
    // Title on one line with any system font size (prova 3: it wrapped at 115%).
    // Room = card content - calendar icon and gaps - the "✕ Close" button.
    const fontScale = PixelRatio.getFontScale();
    const contentW = (cardWidth ?? Math.min(winW * 0.9, 500)) - 2 * 20 - 2;
    const closeW = 18 + 4 + estimateTextWidth(t('close') as string, 14, fontScale) + 24;
    const titleRoom = contentW - 24 - 2 * 10 - closeW;
    const titleSize = fitFontSize(t('calendarTitle') as string, titleRoom, 20, 14, fontScale);

    const tripsByDate = useMemo(() => {
        const map: Record<string, Trip[]> = {};
        trips.forEach((tr) => {
            if (tr.date) {
                if (!map[tr.date]) map[tr.date] = [];
                map[tr.date].push(tr);
            }
        });
        return map;
    }, [trips]);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    // Adjust to start on Monday (0=Mon, 6=Sun)
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

    const days: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    // always 6 rows: the card has the same height every month, so the month arrows
    // never move under the finger (prova 3: they jumped between 5- and 6-row months)
    while (days.length < CALENDAR_CELLS) days.push(null);

    const weekDays = useMemo(() => weekdayLetters(language), [language]);

    const prevMonth = () => {
        if (month === 0) { setMonth(11); setYear(year - 1); }
        else setMonth(month - 1);
    };
    const nextMonth = () => {
        if (month === 11) { setMonth(0); setYear(year + 1); }
        else setMonth(month + 1);
    };

    const getDateKey = (day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    const isToday = (day: number) => {
        return day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
    };

    return (
        <Modal supportedOrientations={ALL_ORIENTATIONS} visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={[styles.overlay, { paddingTop: insets.top + 12 }]}>
                <View testID="calendar-view" style={[styles.card, styles.content, { maxHeight: maxCardHeight }, cardWidth !== undefined && { width: cardWidth }, landscape && styles.contentCompact]}>
                        <View onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
                        <View style={[styles.header, landscape && styles.headerCompact]}>
                            <Ionicons name="calendar" size={24} color="#00d4ff" />
                            <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={1}>{t('calendarTitle')}</Text>
                            <TouchableOpacity testID="calendar-close" onPress={onClose} style={styles.closeBtn}
                                accessibilityRole="button" accessibilityLabel={t('close') as string}>
                                <Ionicons name="close" size={18} color="#D1D5DB" />
                                <Text style={styles.closeBtnText}>{t('close')}</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Month navigation */}
                        <View style={[styles.monthNav, landscape && styles.monthNavCompact]}>
                            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                                <Ionicons name="chevron-back" size={20} color="#60A5FA" />
                            </TouchableOpacity>
                            <Text style={styles.monthText}>{months[month]} {year}</Text>
                            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                                <Ionicons name="chevron-forward" size={20} color="#60A5FA" />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday headers (measures the width of the grid) */}
                        <View onLayout={(e) => setGridW(e.nativeEvent.layout.width)}>
                            <View style={[styles.weekRow, { width: cell * 7 }]}>
                                {cell > 0 && weekDays.map((d, i) => (
                                    <View key={i} style={[styles.weekDayCell, { width: cell }]}>
                                        <Text style={styles.weekDayText}>{d}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        </View>

                        {/* Days grid */}
                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                            <View style={[styles.daysGrid, { width: cell * 7 }]}>
                                {cell > 0 && days.map((day, i) => {
                                    if (day === null) return <View key={`e${i}`} style={[styles.dayCell, { width: cell, height: cellH }]} />;
                                    const dateKey = getDateKey(day);
                                    const tripsOnDay = tripsByDate[dateKey] || [];
                                    const hasTrips = tripsOnDay.length > 0;
                                    const today = isToday(day);

                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.dayCell, { width: cell, height: cellH },
                                                today && styles.todayCell,
                                                hasTrips && styles.tripDayCell,
                                            ]}
                                            disabled={!hasTrips}
                                            onPress={() => {
                                                if (tripsOnDay.length >= 1) {
                                                    onTripSelect(tripsOnDay[0]);
                                                    onClose();
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.dayText,
                                                today && styles.todayText,
                                                hasTrips && styles.tripDayText,
                                            ]}>
                                                {day}
                                            </Text>
                                            {hasTrips && (
                                                <View style={styles.tripDot} />
                                            )}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Trips this month */}
                            {Object.entries(tripsByDate)
                                .filter(([date]) => date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
                                .map(([date, trs]) =>
                                    trs.map((tr) => (
                                        <TouchableOpacity
                                            key={tr.id}
                                            style={styles.tripRow}
                                            onPress={() => { onTripSelect(tr); onClose(); }}
                                        >
                                            <View style={styles.tripDateBadge}>
                                                <Text style={styles.tripDateText}>{date.split('-')[2]}</Text>
                                            </View>
                                            <View style={styles.tripInfo}>
                                                <Text style={styles.tripName} numberOfLines={1}>{tr.title}</Text>
                                                <Text style={styles.tripLoc} numberOfLines={1}>{tr.locationName}</Text>
                                            </View>
                                            {tr.isFavorite && <Ionicons name="heart" size={14} color="#F43F5E" />}
                                        </TouchableOpacity>
                                    ))
                                )}
                        </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // top-anchored, not centred: the month arrows stay in the same place every month
    overlay: { flex: 1, backgroundColor: MODAL_BACKDROP, justifyContent: 'flex-start', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 500, width: '90%' },
    content: { padding: 20, backgroundColor: MODAL_CARD },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    contentCompact: { paddingVertical: 12 },
    headerCompact: { marginBottom: 4 },
    monthNavCompact: { marginBottom: 6 },
    scroll: { flexGrow: 0, flexShrink: 1 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
    closeBtnText: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
    monthNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 },
    navBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10 },
    monthText: { color: '#F0F0F0', fontSize: 18, fontWeight: '700', minWidth: 120, textAlign: 'center' },
    weekRow: { flexDirection: 'row', marginBottom: 8, alignSelf: 'center' },
    weekDayCell: { alignItems: 'center' },
    weekDayText: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap', alignSelf: 'center' },
    dayCell: { justifyContent: 'center', alignItems: 'center' },
    todayCell: { backgroundColor: 'rgba(0,212,255,0.1)', borderRadius: 10 },
    tripDayCell: { backgroundColor: 'rgba(251,191,36,0.14)', borderRadius: 10 },
    dayText: { color: '#9CA3AF', fontSize: 14 },
    todayText: { color: '#00d4ff', fontWeight: '700' },
    tripDayText: { color: GOLD, fontWeight: '700' },
    tripDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: GOLD, marginTop: 2 },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    tripDateBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(251,191,36,0.14)', justifyContent: 'center', alignItems: 'center' },
    tripDateText: { color: GOLD, fontSize: 13, fontWeight: '700' },
    tripInfo: { flex: 1 },
    tripName: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
    tripLoc: { color: '#6B7280', fontSize: 11, marginTop: 2 },
});

export default CalendarView;
