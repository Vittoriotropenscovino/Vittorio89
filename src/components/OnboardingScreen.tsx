import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, FlatList, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { Language } from '../i18n/translations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

const OnboardingScreen: React.FC<OnboardingProps> = ({ onComplete }) => {
    const { t, setLanguage, language } = useApp();
    const [languageChosen, setLanguageChosen] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleLanguageSelect = (lang: Language) => {
        setLanguage(lang);
        setLanguageChosen(true);
    };

    // Language selection screen
    if (!languageChosen) {
        return (
            <View style={styles.container}>
                <View style={styles.langHeader}>
                    <View style={styles.langIconCircle}>
                        <Ionicons name="language" size={36} color="#00d4ff" />
                    </View>
                    <Text style={styles.langPickerTitle}>
                        Seleziona la tua lingua{'\n'}Select your language
                    </Text>
                </View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.langScrollContent}
                    decelerationRate="fast"
                    snapToInterval={132}
                >
                    {LANGUAGE_OPTIONS.map((lang) => (
                        <TouchableOpacity
                            key={lang.code}
                            style={styles.langCard}
                            onPress={() => handleLanguageSelect(lang.code)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.langEmoji}>{lang.emoji}</Text>
                            <Text style={styles.langName}>{lang.name}</Text>
                            <View style={styles.langCodeBadge}>
                                <Text style={styles.langCodeText}>{lang.code.toUpperCase()}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        );
    }

    const slides = [
        { icon: 'earth', title: t('onboardingTitle1'), text: t('onboardingText1'), color: '#00d4ff' },
        { icon: 'camera', title: t('onboardingTitle2'), text: t('onboardingText2'), color: '#60A5FA' },
        { icon: 'stats-chart', title: t('onboardingTitle3'), text: t('onboardingText3'), color: '#8B5CF6' },
    ];

    const handleNext = () => {
        if (currentIndex < slides.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
            setCurrentIndex(currentIndex + 1);
        } else {
            onComplete();
        }
    };

    const renderSlide = ({ item }: { item: typeof slides[0] }) => (
        <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <View style={[styles.iconCircle, { borderColor: item.color }]}>
                <Ionicons name={item.icon as any} size={60} color={item.color} />
            </View>
            <Text style={styles.slideTitle}>{item.title}</Text>
            <Text style={styles.slideText}>{item.text}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList
                ref={flatListRef}
                data={slides}
                renderItem={renderSlide}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                )}
                onMomentumScrollEnd={(e) => {
                    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setCurrentIndex(idx);
                }}
                keyExtractor={(_, i) => i.toString()}
                scrollEventThrottle={16}
            />

            {/* Dots */}
            <View style={styles.dotsRow}>
                {slides.map((_, i) => (
                    <View key={i} style={[
                        styles.dot,
                        currentIndex === i && styles.activeDot,
                    ]} />
                ))}
            </View>

            {/* Bottom buttons */}
            <View style={styles.bottomRow}>
                {currentIndex < slides.length - 1 ? (
                    <>
                        <TouchableOpacity onPress={onComplete}>
                            <Text style={styles.skipText}>{t('skip')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                            <Ionicons name="arrow-forward" size={24} color="#fff" />
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={styles.startButton} onPress={onComplete}>
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
        justifyContent: 'center',
    },
    // Language picker styles
    langHeader: {
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 16,
    },
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
    langScrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 8,
        gap: 12,
        alignItems: 'center',
    },
    langCard: {
        width: 120,
        height: 140,
        backgroundColor: 'rgba(0,212,255,0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(0,212,255,0.2)',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    langEmoji: {
        fontSize: 36,
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
    slide: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 60,
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
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
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
        paddingHorizontal: 40,
        paddingBottom: 30,
    },
    skipText: {
        color: '#6B7280',
        fontSize: 16,
    },
    nextButton: {
        backgroundColor: '#3B82F6',
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
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
    startText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
});

export default OnboardingScreen;
