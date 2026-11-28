import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, PixelRatio } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { ALL_ORIENTATIONS, useOrientation } from '../hooks/useOrientation';
import { MODAL_BACKDROP, MODAL_CARD } from '../utils/surfaces';
import { readingCardSize } from '../utils/readingCard';
import { estimateTextWidth, fitFontSize } from '../utils/fitText';

// 1.4.0 block J: the window shared by Privacy, Terms and Guide. Inside the safe
// area in both orientations, "✕ Close" written (the old one was only an X), title
// sized to stay on at most two lines with a large system font.

interface Props {
    visible: boolean;
    onClose: () => void;
    icon: string;
    title: string;
    testID: string;
    children: React.ReactNode;
}

const PAD = 24;

const ReadingCard: React.FC<Props> = ({ visible, onClose, icon, title, testID, children }) => {
    const { t } = useApp();
    const { width: winW, height: winH } = useOrientation();
    const insets = useSafeAreaInsets();
    const { width, height } = readingCardSize(winW, winH, insets.top, insets.bottom);

    const fontScale = PixelRatio.getFontScale();
    const closeLabel = t('close') as string;
    const closeW = 18 + 4 + estimateTextWidth(closeLabel, 14, fontScale) + 24;
    // room = card - padding - icon - two gaps - the close button
    const titleRoom = width - 2 * PAD - 2 - 24 - 2 * 10 - closeW;
    // one line if it fits at 16 or more ("Come Funziona" wrapped at 130% for no
    // reason); otherwise two lines, and a single long word (Datenschutzerklärung)
    // must not break in the middle
    const oneLine = fitFontSize(title, titleRoom, 20, 16, fontScale);
    const fitsOneLine = estimateTextWidth(title, oneLine, fontScale) <= titleRoom * 0.92;
    const longestWord = title.split(/\s+/).reduce((a, b) => (b.length > a.length ? b : a), '');
    const titleSize = fitsOneLine ? oneLine : Math.min(
        fitFontSize(title, titleRoom * 2, 20, 15, fontScale),
        fitFontSize(longestWord, titleRoom, 20, 15, fontScale),
    );

    return (
        <Modal supportedOrientations={ALL_ORIENTATIONS} visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View testID={testID} style={[styles.card, { width, height }]}>
                    <View style={styles.header}>
                        <Ionicons name={icon as any} size={24} color="#00d4ff" />
                        <Text style={[styles.title, { fontSize: titleSize }]} numberOfLines={fitsOneLine ? 1 : 2}>{title}</Text>
                        <TouchableOpacity testID={`${testID}-close`} onPress={onClose} style={styles.closeBtn}
                            accessibilityRole="button" accessibilityLabel={closeLabel}>
                            <Ionicons name="close" size={18} color="#D1D5DB" />
                            <Text style={styles.closeBtnText} numberOfLines={1}>{closeLabel}</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView
                        style={styles.scroll}
                        showsVerticalScrollIndicator={true}
                        nestedScrollEnabled={true}
                        bounces={true}
                        contentContainerStyle={styles.scrollContent}
                    >
                        {children}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: MODAL_BACKDROP, justifyContent: 'center', alignItems: 'center' },
    card: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', backgroundColor: MODAL_CARD },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 20, paddingHorizontal: PAD, paddingBottom: 14 },
    title: { flex: 1, fontWeight: '700', color: '#F0F0F0' },
    closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
    closeBtnText: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
    scroll: { flexGrow: 1, flexShrink: 1, flexBasis: 0 },
    scrollContent: { paddingHorizontal: PAD, paddingBottom: 40 },
});

export default ReadingCard;
