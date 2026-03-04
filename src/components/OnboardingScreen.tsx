import React, { useRef, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Animated,
    Dimensions, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { Language } from '../i18n/translations';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const LANGUAGE_OPTIONS: { code: Language; flag: string; name: string }[] = [
    { code: 'it', flag: 'IT', name: 'Italiano' },
    { code: 'en', flag: 'EN', name: 'English' },
    { code: 'es', flag: 'ES', name: 'Español' },
    { code: 'fr', flag: 'FR', name: 'Français' },
    { code: 'de', flag: 'DE', name: 'Deutsch' },
    { code: 'pt', flag: 'PT', name: 'Português' },
    { code: 'zh', flag: 'ZH', name: '中文' },
    { code: 'ja', flag: 'JA', name: '日本語' },
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
                <View style={styles.langPickerContainer}>
                    <View style={styles.langIconCircle}>
                        <Ionicons name="language" size={50} color="#00d4ff" />
                    </View>
                    <Text style={styles.langPickerTitle}>
                        Seleziona la tua lingua{'\n'}Select your language
                    </Text>
                    <View style={styles.langGrid}>
                        {LANGUAGE_OPTIONS.map((lang) => (
                            <TouchableOpacity key={lang.code} style={styles.langOption} onPress={() => handleLanguageSelect(lang.code)}>
                                <Text style={styles.langFlag}>{lang.flag}</Text>
                                <Text style={styles.langOptionText}>{lang.name}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
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
    },
    // Language picker styles
    langPickerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    langIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    langPickerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F0F0F0',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 32,
    },
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
        maxWidth: 400,
    },
    langOption: {
        backgroundColor: 'rgba(0,212,255,0.06)',
        borderWidth: 1.5,
        borderColor: 'rgba(0,212,255,0.2)',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        gap: 4,
        width: '45%',
        minWidth: 140,
    },
    langFlag: {
        fontSize: 28,
        fontWeight: '900',
        color: '#00d4ff',
        letterSpacing: 2,
    },
    langOptionText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#E5E7EB',
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
