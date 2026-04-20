import React, { useState, useRef, useEffect } from 'react';
import {
    View, Modal, StyleSheet, TouchableOpacity, Image, FlatList,
    useWindowDimensions, StatusBar, Text, Platform,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { MediaItem } from '../types';

interface Props {
    visible: boolean;
    media: MediaItem[];
    initialIndex: number;
    onClose: () => void;
}

interface ZoomableImageProps {
    uri: string;
    width: number;
    height: number;
    isActive: boolean;
    onZoomChange: (zoomed: boolean) => void;
    onSingleTap: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
    uri, width, height, isActive, onZoomChange, onSingleTap,
}) => {
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    useEffect(() => {
        if (!isActive) {
            scale.value = withTiming(1);
            translateX.value = withTiming(0);
            translateY.value = withTiming(0);
            savedScale.value = 1;
            savedTranslateX.value = 0;
            savedTranslateY.value = 0;
            onZoomChange(false);
        }
    }, [isActive]);

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = Math.max(1, Math.min(5, savedScale.value * e.scale));
        })
        .onEnd(() => {
            savedScale.value = scale.value;
            if (scale.value < 1.1) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(onZoomChange)(false);
            } else {
                runOnJS(onZoomChange)(true);
            }
        });

    const pan = Gesture.Pan()
        .onUpdate((e) => {
            if (scale.value > 1) {
                translateX.value = savedTranslateX.value + e.translationX;
                translateY.value = savedTranslateY.value + e.translationY;
            }
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    const doubleTap = Gesture.Tap()
        .numberOfTaps(2)
        .onEnd(() => {
            if (scale.value > 1) {
                scale.value = withTiming(1);
                translateX.value = withTiming(0);
                translateY.value = withTiming(0);
                savedScale.value = 1;
                savedTranslateX.value = 0;
                savedTranslateY.value = 0;
                runOnJS(onZoomChange)(false);
            } else {
                scale.value = withTiming(2.5);
                savedScale.value = 2.5;
                runOnJS(onZoomChange)(true);
            }
        });

    const singleTap = Gesture.Tap()
        .numberOfTaps(1)
        .onEnd(() => {
            runOnJS(onSingleTap)();
        });

    const composed = Gesture.Race(
        doubleTap,
        Gesture.Simultaneous(pinch, pan),
        singleTap,
    );

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={[{ width, height, justifyContent: 'center', alignItems: 'center' }, animatedStyle]}>
                <Image source={{ uri }} style={{ width, height }} resizeMode="contain" />
            </Animated.View>
        </GestureDetector>
    );
};

const PhotoFullscreen: React.FC<Props> = ({ visible, media, initialIndex, onClose }) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [showUI, setShowUI] = useState(true);
    const [isZoomed, setIsZoomed] = useState(false);
    const listRef = useRef<FlatList>(null);

    const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / SCREEN_WIDTH);
        if (index !== currentIndex && index >= 0 && index < media.length) {
            setCurrentIndex(index);
            setIsZoomed(false);
        }
    };

    const toggleUI = () => setShowUI((v) => !v);

    const renderItem = ({ item, index }: { item: MediaItem; index: number }) => {
        if (item.type === 'video') {
            return (
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={toggleUI}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: 'center', alignItems: 'center' }}
                >
                    <Video
                        source={{ uri: item.uri }}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                        resizeMode={ResizeMode.CONTAIN}
                        useNativeControls
                        shouldPlay={index === currentIndex}
                        isLooping={false}
                    />
                </TouchableOpacity>
            );
        }
        return (
            <ZoomableImage
                uri={item.uri}
                width={SCREEN_WIDTH}
                height={SCREEN_HEIGHT}
                isActive={index === currentIndex}
                onZoomChange={setIsZoomed}
                onSingleTap={toggleUI}
            />
        );
    };

    return (
        <Modal visible={visible} animationType="fade" transparent={false} statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <GestureHandlerRootView style={styles.container}>
                <StatusBar hidden={!showUI} />
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
                    scrollEnabled={!isZoomed}
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
            </GestureHandlerRootView>
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
