import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Image,
    FlatList,
    useWindowDimensions,
    Alert,
    ViewToken,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { MemoryViewerProps, MediaItem } from '../types';

const MemoryViewer: React.FC<MemoryViewerProps> = ({ trip, visible, onClose, onDelete, onShare }) => {
    const flatListRef = useRef<FlatList>(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;
    const isSmallPhone = SCREEN_WIDTH < 400;

    // Track visible item for video playback
    const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
    const onViewableItemsChanged = useRef(
        ({ viewableItems }: { viewableItems: ViewToken[] }) => {
            if (viewableItems.length > 0 && viewableItems[0].index != null) {
                setActiveIndex(viewableItems[0].index);
            }
        }
    ).current;

    if (!trip) return null;

    const mediaWidth = isTablet ? SCREEN_WIDTH * 0.7 : SCREEN_WIDTH * 0.9;
    const mediaHeight = SCREEN_HEIGHT * 0.65;

    const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => {
        const isActive = index === activeIndex;

        return (
            <View style={[styles.mediaContainer, { width: mediaWidth, height: mediaHeight }]}>
                {item.type === 'video' ? (
                    isActive ? (
                        <Video
                            source={{ uri: item.uri }}
                            style={styles.media}
                            resizeMode={ResizeMode.CONTAIN}
                            useNativeControls
                            shouldPlay={false}
                            isLooping={false}
                            isMuted={false}
                        />
                    ) : (
                        <View style={styles.videoPlaceholder}>
                            <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.7)" />
                            <Text style={styles.videoPlaceholderText}>Video</Text>
                        </View>
                    )
                ) : (
                    <Image
                        source={{ uri: item.uri }}
                        style={styles.media}
                        resizeMode="contain"
                    />
                )}
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={isSmallPhone ? 60 : 80} color="rgba(255,255,255,0.2)" />
            <Text style={[styles.emptyText, isSmallPhone && { fontSize: 18 }]}>Nessuna foto aggiunta</Text>
            <Text style={styles.emptySubtext}>
                Aggiungi foto a questo viaggio per visualizzarle qui
            </Text>
        </View>
    );

    const handleDelete = () => {
        if (!trip || !onDelete) return;
        Alert.alert(
            'Elimina Viaggio',
            `Sei sicuro di voler eliminare "${trip.title}"? Questa azione non può essere annullata.`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina',
                    style: 'destructive',
                    onPress: () => {
                        onDelete(trip.id);
                        onClose();
                    },
                },
            ]
        );
    };

    const handleShare = () => {
        if (!trip || !onShare) return;
        onShare(trip);
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {/* Header Overlay */}
                <BlurView intensity={60} style={styles.headerOverlay} tint="dark">
                    <View style={styles.headerContent}>
                        <View style={styles.tripInfo}>
                            <Text
                                style={[styles.tripTitle, isSmallPhone && { fontSize: 24 }]}
                                numberOfLines={1}
                            >
                                {trip.title}
                            </Text>
                            <View style={styles.tripMeta}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="location" size={isSmallPhone ? 14 : 16} color="#60A5FA" />
                                    <Text style={[styles.metaText, isSmallPhone && { fontSize: 13 }]}>
                                        {trip.locationName.split(',')[0]}
                                    </Text>
                                </View>
                                {trip.date && (
                                    <View style={styles.metaItem}>
                                        <Ionicons name="calendar" size={isSmallPhone ? 14 : 16} color="#60A5FA" />
                                        <Text style={[styles.metaText, isSmallPhone && { fontSize: 13 }]}>{trip.date}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <View style={styles.headerButtons}>
                            {onShare && (
                                <TouchableOpacity
                                    onPress={handleShare}
                                    style={styles.shareButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="share-outline" size={isSmallPhone ? 20 : 22} color="#60A5FA" />
                                </TouchableOpacity>
                            )}
                            {onDelete && (
                                <TouchableOpacity
                                    onPress={handleDelete}
                                    style={styles.deleteButton}
                                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                >
                                    <Ionicons name="trash-outline" size={isSmallPhone ? 20 : 22} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity
                                onPress={onClose}
                                style={styles.closeButton}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="close" size={isSmallPhone ? 24 : 28} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>

                {/* Media Gallery */}
                <View style={styles.galleryContainer}>
                    {trip.media && trip.media.length > 0 ? (
                        <FlatList
                            ref={flatListRef}
                            data={trip.media}
                            renderItem={renderMediaItem}
                            keyExtractor={(_, index) => index.toString()}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={mediaWidth}
                            snapToAlignment="center"
                            decelerationRate="fast"
                            onViewableItemsChanged={onViewableItemsChanged}
                            viewabilityConfig={viewabilityConfig}
                            scrollEventThrottle={16}
                            contentContainerStyle={[
                                styles.galleryContent,
                                { paddingHorizontal: (SCREEN_WIDTH - mediaWidth) / 2 }
                            ]}
                        />
                    ) : (
                        renderEmptyState()
                    )}
                </View>

                {/* Page Indicator */}
                {trip.media && trip.media.length > 1 && (
                    <View style={styles.pageIndicator}>
                        {trip.media.map((_, index) => (
                            <View
                                key={index}
                                style={[
                                    styles.dot,
                                    activeIndex === index && styles.activeDot
                                ]}
                            />
                        ))}
                    </View>
                )}

                {/* Media Counter */}
                {trip.media && trip.media.length > 0 && (
                    <BlurView intensity={40} style={styles.counterOverlay} tint="dark">
                        <Ionicons name="images" size={isSmallPhone ? 14 : 16} color="#9CA3AF" />
                        <Text style={[styles.counterText, isSmallPhone && { fontSize: 12 }]}>
                            {activeIndex + 1} / {trip.media.length}
                        </Text>
                    </BlurView>
                )}

                {/* Navigation Hint */}
                {trip.media && trip.media.length > 1 && activeIndex === 0 && (
                    <View style={styles.navHint}>
                        <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.4)" />
                        <Text style={styles.navHintText}>Scorri per navigare</Text>
                        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.4)" />
                    </View>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 5, 15, 0.95)',
    },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingTop: 16,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    tripInfo: {
        flex: 1,
        marginRight: 16,
    },
    tripTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
        marginBottom: 6,
    },
    tripMeta: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '400',
    },
    headerButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    shareButton: {
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(96, 165, 250, 0.3)',
    },
    deleteButton: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    closeButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    galleryContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 90,
    },
    galleryContent: {
        alignItems: 'center',
    },
    mediaContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    media: {
        width: '100%',
        height: '100%',
    },
    videoPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        width: '100%',
    },
    videoPlaceholderText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        marginTop: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        fontSize: 22,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 20,
    },
    emptySubtext: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.3)',
        textAlign: 'center',
        marginTop: 8,
    },
    pageIndicator: {
        position: 'absolute',
        bottom: 70,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    activeDot: {
        backgroundColor: '#60A5FA',
        width: 24,
    },
    counterOverlay: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        overflow: 'hidden',
    },
    counterText: {
        color: '#9CA3AF',
        fontSize: 14,
        fontWeight: '500',
    },
    navHint: {
        position: 'absolute',
        bottom: 24,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    navHintText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
    },
});

export default MemoryViewer;
