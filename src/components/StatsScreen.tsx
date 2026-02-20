import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Trip } from '../types';
import { useApp } from '../contexts/AppContext';

interface Props {
    visible: boolean;
    onClose: () => void;
    trips: Trip[];
}

const StatsScreen: React.FC<Props> = ({ visible, onClose, trips }) => {
    const { t } = useApp();

    const stats = useMemo(() => {
        const totalPhotos = trips.reduce((s, tr) => s + tr.media.filter(m => m.type === 'image').length, 0);
        const totalVideos = trips.reduce((s, tr) => s + tr.media.filter(m => m.type === 'video').length, 0);
        const countries = new Set(trips.map(tr => tr.locationName.split(',').pop()?.trim())).size;

        // Trips by month
        const monthCounts = new Array(12).fill(0);
        trips.forEach(tr => {
            if (tr.date) {
                const m = parseInt(tr.date.split('-')[1], 10);
                if (m >= 1 && m <= 12) monthCounts[m - 1]++;
            }
        });
        const maxMonth = Math.max(...monthCounts, 1);

        // First and last trip
        const sorted = [...trips].sort((a, b) => a.date.localeCompare(b.date));
        const firstDate = sorted.length > 0 ? sorted[0].date : '-';
        const lastDate = sorted.length > 0 ? sorted[sorted.length - 1].date : '-';

        // Favorite count
        const favCount = trips.filter(tr => tr.isFavorite).length;

        return { totalPhotos, totalVideos, countries, monthCounts, maxMonth, firstDate, lastDate, favCount };
    }, [trips]);

    const months = t('months') as string[];

    return (
        <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={[styles.card, styles.content]}>
                        <View style={styles.header}>
                            <Ionicons name="stats-chart" size={24} color="#00d4ff" />
                            <Text style={styles.title}>{t('statistics')}</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
                            {/* Big numbers */}
                            <View style={styles.bigNumbers}>
                                <View style={styles.bigNumItem}>
                                    <Text style={styles.bigNum}>{trips.length}</Text>
                                    <Text style={styles.bigNumLabel}>{t('totalTrips')}</Text>
                                </View>
                                <View style={styles.bigNumDivider} />
                                <View style={styles.bigNumItem}>
                                    <Text style={styles.bigNum}>{stats.totalPhotos}</Text>
                                    <Text style={styles.bigNumLabel}>{t('totalPhotos')}</Text>
                                </View>
                                <View style={styles.bigNumDivider} />
                                <View style={styles.bigNumItem}>
                                    <Text style={styles.bigNum}>{stats.countries}</Text>
                                    <Text style={styles.bigNumLabel}>{t('countriesVisited')}</Text>
                                </View>
                            </View>

                            {/* Details row */}
                            <View style={styles.detailRow}>
                                <View style={styles.detailItem}>
                                    <Ionicons name="videocam-outline" size={16} color="#8B5CF6" />
                                    <Text style={styles.detailText}>{stats.totalVideos} video</Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Ionicons name="heart" size={16} color="#F43F5E" />
                                    <Text style={styles.detailText}>{stats.favCount} {t('byFavorites').toLowerCase()}</Text>
                                </View>
                            </View>

                            {/* Date range */}
                            <View style={styles.dateRange}>
                                <View style={styles.dateItem}>
                                    <Text style={styles.dateLabel}>{t('firstTrip')}</Text>
                                    <Text style={styles.dateValue}>{stats.firstDate}</Text>
                                </View>
                                <Ionicons name="arrow-forward" size={16} color="#4B5563" />
                                <View style={styles.dateItem}>
                                    <Text style={styles.dateLabel}>{t('lastTrip')}</Text>
                                    <Text style={styles.dateValue}>{stats.lastDate}</Text>
                                </View>
                            </View>

                            {/* Monthly chart */}
                            <Text style={styles.chartTitle}>{t('tripsByMonth')}</Text>
                            <View style={styles.chart}>
                                {stats.monthCounts.map((count, i) => (
                                    <View key={i} style={styles.barCol}>
                                        <View style={styles.barContainer}>
                                            <View style={[
                                                styles.bar,
                                                {
                                                    height: `${Math.max((count / stats.maxMonth) * 100, 4)}%`,
                                                    backgroundColor: count > 0 ? '#00d4ff' : 'rgba(0,212,255,0.15)',
                                                },
                                            ]} />
                                        </View>
                                        <Text style={styles.barLabel}>{months[i]}</Text>
                                        {count > 0 && <Text style={styles.barCount}>{count}</Text>}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', maxWidth: 600, width: '92%', maxHeight: '88%' },
    content: { padding: 24, backgroundColor: 'rgba(15,15,20,0.85)' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { padding: 4 },
    scroll: { maxHeight: 500 },
    bigNumbers: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 20 },
    bigNumItem: { alignItems: 'center' },
    bigNum: { fontSize: 36, fontWeight: '900', color: '#00d4ff' },
    bigNumLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
    bigNumDivider: { width: 1, height: 40, backgroundColor: 'rgba(0,212,255,0.15)' },
    detailRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 16 },
    detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    detailText: { color: '#9CA3AF', fontSize: 13 },
    dateRange: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 14, marginBottom: 20 },
    dateItem: { alignItems: 'center' },
    dateLabel: { color: '#6B7280', fontSize: 10, marginBottom: 2 },
    dateValue: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
    chartTitle: { color: '#9CA3AF', fontSize: 13, fontWeight: '600', marginBottom: 12 },
    chart: { flexDirection: 'row', justifyContent: 'space-between', height: 120, gap: 2 },
    barCol: { flex: 1, alignItems: 'center' },
    barContainer: { flex: 1, justifyContent: 'flex-end', width: '80%' },
    bar: { width: '100%', borderRadius: 3, minHeight: 3 },
    barLabel: { color: '#6B7280', fontSize: 9, marginTop: 4 },
    barCount: { color: '#00d4ff', fontSize: 9, fontWeight: '700' },
});

export default StatsScreen;
