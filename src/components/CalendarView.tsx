import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { useApp } from '../contexts/AppContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    trips: Trip[];
    onTripSelect: (trip: Trip) => void;
}

const CalendarView: React.FC<Props> = ({ visible, onClose, trips, onTripSelect }) => {
    const { t, language } = useApp();
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth());
    const months = t('months') as string[];

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

    const weekDays = language === 'en' ? ['M', 'T', 'W', 'T', 'F', 'S', 'S'] : ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

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
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, styles.content]}>
                        <View style={styles.header}>
                            <Ionicons name="calendar" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('calendarTitle')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Month navigation */}
                        <View style={styles.monthNav}>
                            <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
                                <Ionicons name="chevron-back" size={20} color="#60A5FA" />
                            </TouchableOpacity>
                            <Text style={styles.monthText}>{months[month]} {year}</Text>
                            <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
                                <Ionicons name="chevron-forward" size={20} color="#60A5FA" />
                            </TouchableOpacity>
                        </View>

                        {/* Weekday headers */}
                        <View style={styles.weekRow}>
                            {weekDays.map((d, i) => (
                                <View key={i} style={styles.weekDayCell}>
                                    <Text style={styles.weekDayText}>{d}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Days grid */}
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.daysGrid}>
                                {days.map((day, i) => {
                                    if (day === null) return <View key={`e${i}`} style={styles.dayCell} />;
                                    const dateKey = getDateKey(day);
                                    const tripsOnDay = tripsByDate[dateKey] || [];
                                    const hasTrips = tripsOnDay.length > 0;
                                    const today = isToday(day);

                                    return (
                                        <TouchableOpacity
                                            key={i}
                                            style={[
                                                styles.dayCell,
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
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 500, width: '90%', maxHeight: '88%' },
    content: { padding: 20, backgroundColor: 'rgba(15,15,20,0.85)' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    monthNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginBottom: 16 },
    navBtn: { padding: 8, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 10 },
    monthText: { color: '#F0F0F0', fontSize: 18, fontWeight: '700', minWidth: 120, textAlign: 'center' },
    weekRow: { flexDirection: 'row', marginBottom: 8 },
    weekDayCell: { flex: 1, alignItems: 'center' },
    weekDayText: { color: '#6B7280', fontSize: 11, fontWeight: '600' },
    daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    dayCell: { width: `${100 / 7}%`, aspectRatio: 1.2, justifyContent: 'center', alignItems: 'center' },
    todayCell: { backgroundColor: 'rgba(0,212,255,0.1)', borderRadius: 10 },
    tripDayCell: { backgroundColor: 'rgba(59,130,246,0.15)', borderRadius: 10 },
    dayText: { color: '#9CA3AF', fontSize: 14 },
    todayText: { color: '#00d4ff', fontWeight: '700' },
    tripDayText: { color: '#60A5FA', fontWeight: '700' },
    tripDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#3B82F6', marginTop: 2 },
    tripRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    tripDateBadge: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(0,212,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    tripDateText: { color: '#00d4ff', fontSize: 13, fontWeight: '700' },
    tripInfo: { flex: 1 },
    tripName: { color: '#E5E7EB', fontSize: 14, fontWeight: '600' },
    tripLoc: { color: '#6B7280', fontSize: 11, marginTop: 2 },
});

export default CalendarView;
