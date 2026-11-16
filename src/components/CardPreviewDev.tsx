import React, { useState } from 'react';
import { Modal, Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import ShareCard from './ShareCard';
import { TravelStats } from '../utils/travelStats';

// ONLY in the emulator test build (EXPO_PUBLIC_ROTAZIONE_LIBERA=1): shows the
// share card full width with sample numbers, to take the checkpoint PNGs.
// A tap moves to the next sample. Never reachable in store or phone builds.
export interface CardSample {
    label: string;
    stats: TravelStats;
    travelerName?: string;
    campaign?: string;
}

export const CARD_SAMPLES: CardSample[] = [
    { label: '0 viaggi (solo paesi segnati)', stats: { countries: 12, continents: 3, trips: 0 } },
    { label: '1 viaggio', stats: { countries: 1, continents: 1, trips: 1 }, travelerName: 'Vittorio' },
    { label: 'molti viaggi', stats: { countries: 23, continents: 5, trips: 47 }, travelerName: 'Vittorio' },
];

const CardPreviewDev: React.FC<{ visible: boolean; onClose: () => void; samples?: CardSample[] }> = ({
    visible, onClose, samples = CARD_SAMPLES,
}) => {
    const { width, height } = useWindowDimensions();
    const [index, setIndex] = useState(0);
    const sample = samples[index % samples.length];
    const cardWidth = Math.min(width, Math.floor(height * (9 / 16)));
    return (
        <Modal visible={visible} statusBarTranslucent onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
            <StatusBar hidden />
            <Pressable testID="card-dev" style={styles.root} onPress={() => setIndex((i) => i + 1)} onLongPress={onClose}>
                <ShareCard stats={sample.stats} travelerName={sample.travelerName} width={cardWidth} campaign={sample.campaign} />
                <View style={styles.info}>
                    <Text style={styles.infoText} testID="card-dev-label">{`${index % samples.length + 1}/${samples.length} · ${sample.label}`}</Text>
                </View>
            </Pressable>
        </Modal>
    );
};

const styles = StyleSheet.create({
    // 48 dp below the top: clear of the status bar, so the screenshot crop is clean.
    root: { flex: 1, backgroundColor: '#000', alignItems: 'flex-start', paddingTop: 48 },
    info: { padding: 12 },
    infoText: { color: '#9CA3AF', fontSize: 14 },
});

export default CardPreviewDev;
