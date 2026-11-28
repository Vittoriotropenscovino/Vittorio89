import React, { useEffect, useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    FlatList, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { Language } from '../i18n/translations';
import { useOrientation } from '../hooks/useOrientation';

const LANGUAGE_OPTIONS: { code: Language; emoji: string; name: string }[] = [
    { code: 'it', emoji: '\u{1F1EE}\u{1F1F9}', name: 'Italiano' },
    { code: 'en', emoji: '\u{1F1EC}\u{1F1E7}', name: 'English' },
    { code: 'es', emoji: '\u{1F1EA}\u{1F1F8}', name: 'Español' },
    { code: 'fr', emoji: '\u{1F1EB}\u{1F1F7}', name: 'Français' },
    { code: 'de', emoji: '\u{1F1E9}\u{1F1EA}', name: 'Deutsch' },
    { code: 'pt', emoji: '\u{1F1E7}\u{1F1F7}', name: 'Português' },
    { code: 'zh', emoji: '\u{1F1E8}\u{1F1F3}', name: '中文' },
    { code: 'ja', emoji: '\u{1F1EF}\u{1F1F5}', name: '日本語' },
];

interface OnboardingProps {
    onComplete: () => void;
}

// 1.4.0 block J: the sizes come from the CURRENT window (useOrientation), not
// from one reading at startup, so turning the phone does not break the pages.
// Portrait: languages in a 2-column grid, each page with the picture on top and
// the text below. Landscape: languages in one scrolling row, picture on the left
// and text on the right (the old layout went past the screen with big fonts).
const OnboardingScreen: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { t, setLanguage } = useApp();
    const { width: winW, isLandscape } = useOrientation();
    const insets = useSafeAreaInsets();
    const [languageChosen, setLanguageChosen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    // after a rotation the pages get the new width: go back to the same page
    useEffect(() => {
        if (!languageChosen) return;
        const id = setTimeout(() => flatListRef.current?.scrollToOffset({ offset: currentIndex * winW, animated: false }), 0);
        return () => clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [winW]);

    const handleLanguageSelect = (lang: Language) => {
        setLanguage(lang);
        setLanguageChosen(true);
    };

    // Language selection screen
    if (!languageChosen) {
        // portrait 2 per row, landscape 4 per row: all 8 visible without scrolling
        const cols = isLandscape ? 4 : 2;
        const gridW = Math.min(winW - insets.left - insets.right - 48, isLandscape ? 760 : 520);
        const cardW = Math.floor((gridW - 12 * (cols - 1)) / cols);
        const cards = LANGUAGE_OPTIONS.map((lang) => (
            <TouchableOpacity
                key={lang.code}
                testID={`onboarding-lang-${lang.code}`}
                style={[styles.langCard, isLandscape && styles.langCardLandscape, { width: cardW }]}
                onPress={() => handleLanguageSelect(lang.code)}
                activeOpacity={0.7}
            >
                <Text style={isLandscape ? styles.langEmojiLandscape : styles.langEmoji}>{lang.emoji}</Text>
                <Text style={styles.langName} numberOfLines={1}>{lang.name}</Text>
                <View style={styles.langCodeBadge}>
                    <Text style={styles.langCodeText}>{lang.code.toUpperCase()}</Text>
                </View>
            </TouchableOpacity>
        ));
        return (
            <ScrollView
                testID="onboarding-languages"
                style={styles.container}
                contentContainerStyle={[styles.langPage, {
                    paddingTop: insets.top + 16,
                    paddingBottom: insets.bottom + 16,
                    paddingLeft: insets.left,
                    paddingRight: insets.right,
                }]}
            >
                <View style={[styles.langHeader, isLandscape && styles.langHeaderLandscape]}>
                    {/* landscape with big fonts: no icon and one title line, so both rows of languages fit */}
                    {!isLandscape && (
                        <View style={styles.langIconCircle}>
                            <Ionicons name="language" size={36} color="#00d4ff" />
                        </View>
                    )}
                    <Text style={styles.langPickerTitle}>
                        Seleziona la tua lingua{isLandscape ? ' · ' : '\n'}Select your language
                    </Text>
                </View>
                <View style={[styles.langGrid, isLandscape && styles.langGridLandscape, { width: gridW }]}>{cards}</View>
            </ScrollView>
        );
    }

    const slides = [
        { icon: 'earth', title: t('onboardingTitle1'), text: t('onboardingText1'), color: '#00d4ff' },
        { icon: 'camera', title: t('onboardingTitle2'), text: t('onboardingText2'), color: '#60A5FA' },
        { icon: 'stats-chart', title: t('onboardingTitle3'), text: t('onboardingText3'), color: '#8B5CF6' },
    ];

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToOffset({ offset: (currentIndex + 1) * winW, animated: true });
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
    };

    const renderSlide = ({ item }: { item: typeof slides[0] }) => (
        <ScrollView
            style={{ width: winW }}
            contentContainerStyle={[
                styles.slide,
                isLandscape && styles.slideLandscape,
                { paddingLeft: 32 + insets.left, paddingRight: 32 + insets.right },
            ]}
            showsVerticalScrollIndicator={false}
        >
            <View style={[styles.iconCircle, isLandscape && styles.iconCircleLandscape, { borderColor: item.color }]}>
                <Ionicons name={item.icon as any} size={isLandscape ? 44 : 60} color={item.color} />
            </View>
            <View style={isLandscape ? styles.slideTextBoxLandscape : styles.slideTextBox}>
                <Text style={[styles.slideTitle, isLandscape && styles.alignLeft]}>{item.title}</Text>
                <Text style={[styles.slideText, isLandscape && styles.alignLeft]}>{item.text}</Text>
            </View>
        </ScrollView>
    );

    return (
        <View testID="onboarding" style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <FlatList
                ref={flatListRef}
                style={styles.pages}
                data={slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                getItemLayout={(_, index) => ({ length: winW, offset: winW * index, index })}
                extraData={`${winW}-${isLandscape}`}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / winW);
                    setCurrentIndex(idx);
                }}
                keyExtractor={(_, i) => i.toString()}
                scrollEventThrottle={16}
            />

            {/* Dots */}
            <View style={[styles.dotsRow, isLandscape && styles.dotsRowLandscape]}>
                {slides.map((_, i) => (
                    <View key={i} style={[
                        styles.dot,
                        currentIndex === i && styles.activeDot,
                    ]} />
                ))}
            </View>

            {/* Bottom buttons, all with written labels */}
            <View style={[
                styles.bottomRow,
                isLandscape && styles.bottomRowLandscape,
                currentIndex === slides.length - 1 && styles.bottomRowCentered,
                { paddingLeft: 40 + insets.left, paddingRight: 40 + insets.right },
            ]}>
                {currentIndex < slides.length - 1 ? (
                    <>
                        <TouchableOpacity testID="onboarding-skip" onPress={onComplete} style={styles.skipBtn}>
                            <Text style={styles.skipText}>{t('skip')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity testID="onboarding-next" style={styles.nextButton} onPress={handleNext}
                            accessibilityRole="button" accessibilityLabel={t('next') as string}>
                            <Text style={styles.nextText} numberOfLines={1}>{t('next')}</Text>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity testID="onboarding-start" style={[styles.startButton, isLandscape && styles.startButtonLandscape]} onPress={onComplete}>
                        <Ionicons name="rocket" size={20} color="#fff" />
                        <Text style={styles.startText}>{t('onboardingStart')}</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050510',
    },
    // Language picker styles
    langPage: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    langHeader: {
        alignItems: 'center',
        paddingBottom: 20,
        paddingHorizontal: 24,
    },
    langHeaderLandscape: { paddingBottom: 12 },
    langIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        borderWidth: 2,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    langPickerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F0F0F0',
        textAlign: 'center',
        lineHeight: 26,
    },
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 12,
    },
    langGridLandscape: { rowGap: 10 },
    langCard: {
        paddingVertical: 14,
        backgroundColor: 'rgba(0,212,255,0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(0,212,255,0.2)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    langCardLandscape: { paddingVertical: 8, gap: 4 },
    langEmoji: {
        fontSize: 30,
    },
    langEmojiLandscape: {
        fontSize: 24,
    },
    langName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E5E7EB',
    },
    langCodeBadge: {
        backgroundColor: 'rgba(0,212,255,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 8,
    },
    langCodeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#00d4ff',
        letterSpacing: 1,
    },
    // Slide styles
    pages: { flex: 1 },
    slide: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
    },
    slideLandscape: {
        flexDirection: 'row',
        gap: 32,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        backgroundColor: 'rgba(0, 212, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    iconCircleLandscape: { width: 96, height: 96, borderRadius: 48, marginBottom: 0 },
    slideTextBox: { alignItems: 'center', maxWidth: 520 },
    slideTextBoxLandscape: { flexShrink: 1, maxWidth: 520 },
    slideTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#F0F0F0',
        marginBottom: 12,
        textAlign: 'center',
    },
    slideText: {
        fontSize: 16,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 24,
    },
    alignLeft: { textAlign: 'left' },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    dotsRowLandscape: { marginBottom: 10 },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    activeDot: {
        backgroundColor: '#00d4ff',
        width: 24,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 30,
        gap: 16,
    },
    bottomRowLandscape: { paddingBottom: 14 },
    bottomRowCentered: { justifyContent: 'center' },
    skipBtn: { paddingVertical: 12, paddingRight: 12 },
    skipText: {
        color: '#6B7280',
        fontSize: 16,
    },
    nextButton: {
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        minHeight: 52,
        paddingHorizontal: 22,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    nextText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        flexShrink: 1,
    },
    startButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#3B82F6',
        paddingVertical: 16,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    startButtonLandscape: { paddingVertical: 12, maxWidth: 480 },
    startText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default OnboardingScreen;
