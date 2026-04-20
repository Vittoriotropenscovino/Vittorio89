import React, { useState, useRef } from 'react';
import {
    View, Modal, StyleSheet, TouchableOpacity, Image, FlatList,
    useWindowDimensions, StatusBar, Text, Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from '../types';

interface Props {
    visible: boolean;
    media: MediaItem[];
    initialIndex: number;
    onClose: () => void;
}

const PhotoFullscreen: React.FC<Props> = ({ visible, media, initialIndex, onClose }) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showUI, setShowUI] = useState(true);
    const listRef = useRef<FlatList>(null);

    const handleScroll = (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        if (index !== currentIndex && index >= 0 && index < media.length) {
            setCurrentIndex(index);
        }
    };

    const renderItem = ({ item, index }: { item: MediaItem; index: number }) => (
        <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUI((v) => !v)}
            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
        >
            {item.type === 'video' ? (
                <Video
                    source={{ uri: item.uri }}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={index === currentIndex}
                    isLooping={false}
                />
            ) : (
                <Image
                    source={{ uri: item.uri }}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                    resizeMode="contain"
                />
            )}
        </TouchableOpacity>
    );

    return (
        <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <StatusBar hidden={!showUI} />
            <View style={styles.container}>
                <FlatList
                    ref={listRef}
                    data={media}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => `fs-${index}`}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => ({
                        length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index,
                    })}
                    windowSize={3}
                    maxToRenderPerBatch={2}
                    initialNumToRender={1}
                    removeClippedSubviews={Platform.OS !== 'web'}
                />

                {showUI && (
                    <>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Ionicons name="close" size={28} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.counter}>
                            <Text style={styles.counterText}>{currentIndex + 1} / {media.length}</Text>
                        </View>
                    </>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    closeBtn: {
        position: 'absolute', top: 50, right: 20,
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, padding: 8,
    },
    counter: {
        position: 'absolute', bottom: 40, alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 16,
        paddingHorizontal: 16, paddingVertical: 6,
    },
    counterText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});

export default PhotoFullscreen;
