import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated, Modal, Platform, Pressable, SectionList, StyleSheet, Text, TextInput,
    TouchableOpacity, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { Trip } from '../types';
import { getCountryFlag } from '../utils/countryFlags';
import { getTravelStats } from '../utils/travelStats';
import { CountryRow, CountrySection, buildCountrySections, countryCounterText } from '../utils/countryPicker';

// Warm accent for "visited" (new screens only): gold, with coral for the diary label.
const GOLD = '#FBBF24';
const GOLD_SOFT = 'rgba(251,191,36,0.12)';
const GOLD_LINE = 'rgba(251,191,36,0.55)';
const CORAL = '#FB7185';
const INK = '#1C1300';

interface Props {
    visible: boolean;
    /** Opened right after onboarding: the secondary button reads "Skip". */
    firstRun: boolean;
    trips: Trip[];
    markedCountries: string[];
    /** Countries that come from trips: always on, cannot be turned off here. */
    diaryCountries: string[];
    onConfirm: (marked: string[]) => void;
    onClose: () => void;
}

type ListItem = CountryRow[]; // one visual row = 1..3 countries (columns)

const chunk = (rows: CountryRow[], size: number): ListItem[] => {
    const out: ListItem[] = [];
    for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
    return out;
};

const CountryCell = memo(function CountryCell({ row, onToggle, diaryLabel }: {
    row: CountryRow; onToggle: (code: string) => void; diaryLabel: string;
}) {
    const on = row.state !== 'off';
    // The row itself never changes size: only a gold flash over it and the check
    // popping in. (Scaling the whole row left rows looking narrower when several
    // were tapped quickly.)
    const flash = useRef(new Animated.Value(0)).current;
    const check = useRef(new Animated.Value(on ? 1 : 0)).current;
    const wasOn = useRef(on);

    useEffect(() => {
        if (wasOn.current === on) return;
        wasOn.current = on;
        check.stopAnimation();
        if (on) {
            check.setValue(0);
            Animated.spring(check, { toValue: 1, friction: 4, tension: 180, useNativeDriver: true }).start();
            flash.stopAnimation();
            flash.setValue(0.45);
            Animated.timing(flash, { toValue: 0, duration: 450, useNativeDriver: true }).start();
        } else {
            Animated.timing(check, { toValue: 0, duration: 140, useNativeDriver: true }).start();
        }
    }, [on, flash, check]);

    const checkScale = check.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
    return (
        <View style={styles.cellWrap}>
            <Pressable
                testID={`wb-row-${row.code}`}
                onPress={() => onToggle(row.code)}
                disabled={row.state === 'diary'}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: on, disabled: row.state === 'diary' }}
                accessibilityLabel={row.name}
                style={({ pressed }) => [
                    styles.cell,
                    on && styles.cellOn,
                    row.state === 'diary' && styles.cellDiary,
                    pressed && styles.cellPressed,
                ]}
            >
                <Text style={styles.flag}>{getCountryFlag(row.code)}</Text>
                <View style={styles.cellText}>
                    <Text style={[styles.cellName, on && styles.cellNameOn]} numberOfLines={1}>{row.name}</Text>
                    {row.state === 'diary' && <Text style={styles.diaryLabel}>{diaryLabel}</Text>}
                </View>
                <View style={[styles.checkRing, on && styles.checkRingOn]}>
                    <Animated.View style={{ opacity: on ? 1 : check, transform: [{ scale: checkScale }] }}>
                        <Ionicons name={row.state === 'diary' ? 'book' : 'checkmark'} size={14} color={INK} />
                    </Animated.View>
                </View>
                <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
            </Pressable>
        </View>
    );
});

const CountryPickerScreen: React.FC<Props> = ({
    visible, firstRun, trips, markedCountries, diaryCountries, onConfirm, onClose,
}) => {
    const { t, language } = useApp();
    const { width, height } = useWindowDimensions();
    const landscape = width > height;

    const [draft, setDraft] = useState<string[]>(markedCountries);
    const [query, setQuery] = useState('');

    // Every time the screen opens, start from what is saved.
    useEffect(() => {
        if (visible) {
            setDraft(markedCountries);
            setQuery('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const markedSet = useMemo(() => new Set(draft), [draft]);
    const diarySet = useMemo(() => new Set(diaryCountries), [diaryCountries]);
    const sections = useMemo(
        () => buildCountrySections(language, query, markedSet, diarySet),
        [language, query, markedSet, diarySet],
    );

    // Same number as the HUD: trips' countries ∪ the countries ticked here.
    const count = useMemo(() => getTravelStats(trips, draft).countries, [trips, draft]);
    const counterScale = useRef(new Animated.Value(1)).current;
    const lastCount = useRef(count);
    useEffect(() => {
        if (lastCount.current === count) return;
        lastCount.current = count;
        counterScale.setValue(1.22);
        Animated.spring(counterScale, { toValue: 1, friction: 4, tension: 140, useNativeDriver: true }).start();
    }, [count, counterScale]);

    const toggle = useCallback((code: string) => {
        if (diarySet.has(code)) return;
        if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
        setDraft((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
    }, [diarySet]);

    // Columns: the list gets the right side in landscape, the full width in portrait.
    const sideWidth = landscape ? Math.min(340, Math.round(width * 0.38)) : 0;
    const listWidth = width - sideWidth - 32;
    const columns = Math.max(1, Math.min(3, Math.floor(listWidth / 260)));
    const listSections = useMemo(
        () => sections.map((s: CountrySection) => ({ ...s, data: chunk(s.data, columns) })),
        [sections, columns],
    );

    const diaryLabel = t('wbFromDiary') as string;
    const counter = (
        <Animated.View style={[styles.counter, { transform: [{ scale: counterScale }] }]} testID="wb-counter">
            <Ionicons name="earth" size={16} color={GOLD} />
            <Text style={styles.counterText}>{countryCounterText(t, count)}</Text>
        </Animated.View>
    );
    const search = (
        <View style={styles.searchBox}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
                testID="wb-search"
                style={styles.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder={t('wbSearch') as string}
                placeholderTextColor="#6B7280"
                autoCorrect={false}
                returnKeyType="search"
                // Android in landscape would otherwise cover the list with a full-screen editor.
                disableFullscreenUI
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel={t('close') as string} hitSlop={10}>
                    <Ionicons name="close-circle" size={18} color="#6B7280" />
                </TouchableOpacity>
            )}
        </View>
    );
    const buttons = (
        <View style={[styles.buttons, landscape && styles.buttonsColumn]}>
            <TouchableOpacity testID="wb-skip" style={[styles.secondaryBtn, !landscape && styles.flex1]} onPress={onClose} accessibilityRole="button">
                <Text style={styles.secondaryText}>{t(firstRun ? 'wbSkip' : 'close') as string}</Text>
            </TouchableOpacity>
            <TouchableOpacity testID="wb-confirm" style={[styles.primaryBtn, !landscape && styles.flex2]} onPress={() => onConfirm(draft)} accessibilityRole="button">
                <Ionicons name="checkmark" size={18} color={INK} />
                <Text style={styles.primaryText}>{t('wbConfirm') as string}</Text>
            </TouchableOpacity>
        </View>
    );
    const title = (
        <View>
            <Text style={styles.title}>{t('wbTitle') as string}</Text>
            <Text style={styles.subtitle}>{t('wbSubtitle') as string}</Text>
        </View>
    );

    const list = (
        <SectionList
            style={styles.list}
            sections={listSections}
            keyExtractor={(item) => item.map((r) => r.code).join('-')}
            stickySectionHeadersEnabled
            keyboardShouldPersistTaps="handled"
            initialNumToRender={18}
            renderSectionHeader={({ section }) => (
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>{t(section.titleKey) as string}</Text>
                    {section.visited > 0 && (
                        <Text style={styles.sectionCount}>{`${section.visited}/${section.total}`}</Text>
                    )}
                </View>
            )}
            renderItem={({ item }) => (
                <View style={styles.rowLine}>
                    {item.map((row) => (
                        <CountryCell key={row.code} row={row} onToggle={toggle} diaryLabel={diaryLabel} />
                    ))}
                    {Array.from({ length: columns - item.length }, (_, i) => <View key={`pad${i}`} style={styles.cellWrap} />)}
                </View>
            )}
            ListEmptyComponent={<Text style={styles.empty}>{t('wbNoResults') as string}</Text>}
        />
    );

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <SafeAreaProvider>
                <SafeAreaView style={styles.root} edges={['top', 'bottom', 'left', 'right']} testID="wb-screen">
                    {landscape ? (
                        <View style={styles.landscape}>
                            <View style={[styles.side, { width: sideWidth }]}>
                                {title}
                                {counter}
                                {search}
                                <View style={styles.flex1} />
                                {buttons}
                            </View>
                            <View style={styles.flex1}>{list}</View>
                        </View>
                    ) : (
                        <View style={styles.portrait}>
                            {title}
                            {counter}
                            {search}
                            <View style={styles.flex1}>{list}</View>
                            {buttons}
                        </View>
                    )}
                </SafeAreaView>
            </SafeAreaProvider>
        </Modal>
    );
};

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#070712' },
    flex1: { flex: 1 },
    flex2: { flex: 2 },
    landscape: { flex: 1, flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 16 },
    portrait: { flex: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
    side: { gap: 12, paddingVertical: 4 },
    title: { color: '#F8F8F8', fontSize: 24, fontWeight: '800' },
    subtitle: { color: '#9CA3AF', fontSize: 13, marginTop: 2 },
    counter: {
        flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
        backgroundColor: GOLD_SOFT, borderWidth: 1, borderColor: GOLD_LINE,
        borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7,
    },
    counterText: { color: GOLD, fontSize: 15, fontWeight: '800' },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
        borderRadius: 12, paddingHorizontal: 12,
    },
    searchInput: { flex: 1, color: '#F0F0F0', fontSize: 15, paddingVertical: Platform.OS === 'ios' ? 10 : 7 },
    list: { flex: 1 },
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#070712', paddingTop: 12, paddingBottom: 6,
    },
    sectionTitle: { color: '#9CA3AF', fontSize: 12, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
    sectionCount: { color: GOLD, fontSize: 12, fontWeight: '800' },
    rowLine: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    cellWrap: { flex: 1 },
    cell: {
        flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
    },
    cellOn: { backgroundColor: GOLD_SOFT, borderColor: GOLD_LINE },
    cellDiary: { opacity: 0.85 },
    cellPressed: { opacity: 0.7 },
    flag: { fontSize: 22 },
    cellText: { flex: 1 },
    cellName: { color: '#E5E7EB', fontSize: 15 },
    cellNameOn: { color: '#FFF7E0', fontWeight: '700' },
    diaryLabel: { color: CORAL, fontSize: 11, fontWeight: '700', marginTop: 1 },
    flash: { ...StyleSheet.absoluteFillObject, borderRadius: 12, backgroundColor: GOLD },
    checkRing: {
        width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.25)',
        alignItems: 'center', justifyContent: 'center',
    },
    checkRingOn: { backgroundColor: GOLD, borderColor: GOLD },
    empty: { color: '#9CA3AF', textAlign: 'center', marginTop: 40, fontSize: 14 },
    buttons: { flexDirection: 'row', gap: 10 },
    buttonsColumn: { flexDirection: 'column-reverse' },
    primaryBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: GOLD, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 18,
    },
    primaryText: { color: INK, fontSize: 16, fontWeight: '800' },
    secondaryBtn: {
        alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    },
    secondaryText: { color: '#E5E7EB', fontSize: 15, fontWeight: '600' },
});

export default CountryPickerScreen;
