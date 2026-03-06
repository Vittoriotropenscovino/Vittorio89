import React, { useRef, useState, useEffect } from 'react';
import {
    View, Text, Modal, StyleSheet, TouchableOpacity, Image,
    FlatList, useWindowDimensions, Alert, Platform, Share,
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { MemoryViewerProps, MediaItem } from '../types';
import { useApp } from '../contexts/AppContext';

const MemoryViewer: React.FC<MemoryViewerProps> = ({ trip, visible, onClose, onDelete, onEdit }) => {
    const { t } = useApp();
    const [currentIndex, setCurrentIndex] = useState(0);
    const mainListRef = useRef<FlatList>(null);
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

    // Reset currentIndex when trip changes or viewer opens to prevent out-of-bounds
    useEffect(() => {
        setCurrentIndex(0);
        if (mainListRef.current && visible) {
            mainListRef.current.scrollToOffset({ offset: 0, animated: false });
        }
    }, [trip?.id, visible]);

    if (!trip) return null;

    // Main viewer dimensions - 90% of screen
    const viewerWidth = SCREEN_WIDTH * 0.92;
    const viewerHeight = SCREEN_HEIGHT * 0.68;
    const thumbSize = 56;

    const handleShare = async () => {
        try {
            const message = `${trip.title}\n${trip.locationName}\n${trip.date}${trip.notes ? '\n\n' + trip.notes : ''}\n\n— TravelSphere`;
            await Share.share({ message, title: trip.title });
        } catch (e) {
            console.error('Share error:', e);
        }
    };

    const handleDelete = () => {
        if (!trip || !onDelete) return;
        Alert.alert(
            t('deleteTrip') as string,
            `${t('deleteConfirm')} "${trip.title}"? ${t('deleteWarning')}`,
            [
                { text: t('cancel') as string, style: 'cancel' },
                {
                    text: t('delete') as string, style: 'destructive',
                    onPress: () => {
                        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        onDelete(trip.id); onClose();
                    },
                },
            ]
        );
    };

    const goToIndex = (index: number) => {
        setCurrentIndex(index);
        mainListRef.current?.scrollToIndex({ index, animated: true });
    };

    const handleMainScroll = (event: any) => {
        const offset = event.nativeEvent.contentOffset.x;
        const index = Math.round(offset / viewerWidth);
        if (index !== currentIndex && index >= 0 && index < (trip.media?.length || 0)) {
            setCurrentIndex(index);
        }
    };

    const renderMainItem = ({ item, index }: { item: MediaItem; index: number }) => (
        <View style={[styles.mainMediaContainer, { width: viewerWidth, height: viewerHeight }]}>
            {item.type === 'video' ? (
                <Video
                    source={{ uri: item.uri }}
                    style={styles.media}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                    shouldPlay={index === currentIndex}
                    isLooping={false}
                />
            ) : (
                <Image source={{ uri: item.uri }} style={styles.media} resizeMode="contain" />
            )}
        </View>
    );

    const renderThumbnail = ({ item, index }: { item: MediaItem; index: number }) => (
        <TouchableOpacity
            onPress={() => goToIndex(index)}
            style={[
                styles.thumbnailContainer,
                { width: thumbSize, height: thumbSize },
                currentIndex === index && styles.thumbnailActive,
            ]}
        >
            {item.type === 'video' ? (
                <View style={styles.videoThumbBg}>
                    <Ionicons name="videocam" size={22} color="#00d4ff" />
                </View>
            ) : (
                <Image source={{ uri: item.uri }} style={styles.thumbImage} />
            )}
        </TouchableOpacity>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={80} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>{t('noPhotos')}</Text>
            <Text style={styles.emptySubtext}>{t('addPhotosHint')}</Text>
        </View>
    );

    const hasMedia = trip.media && trip.media.length > 0;

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
            <BlurView intensity={25} tint="dark" style={styles.overlay}>
                {/* Header */}
                <View style={styles.headerBar}>
                    <View style={styles.tripInfoRow}>
                        <View style={styles.tripInfo}>
                            <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                            <View style={styles.tripMeta}>
                                <Ionicons name="location" size={14} color="#00d4ff" />
                                <Text style={styles.metaText}>{trip.locationName.split(',')[0]}</Text>
                                {trip.date ? (
                                    <>
                                        <Ionicons name="calendar" size={14} color="#00d4ff" style={{ marginLeft: 12 }} />
                                        <Text style={styles.metaText}>{trip.date}</Text>
                                    </>
                                ) : null}
                            </View>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity onPress={handleShare} style={styles.actionBtn}>
                                <Ionicons name="share-outline" size={20} color="#00d4ff" />
                            </TouchableOpacity>
                            {onEdit && (
                                <TouchableOpacity onPress={() => { onEdit(trip); onClose(); }} style={styles.actionBtn}>
                                    <Ionicons name="create-outline" size={20} color="#60A5FA" />
                                </TouchableOpacity>
                            )}
                            {onDelete && (
                                <TouchableOpacity onPress={handleDelete} style={[styles.actionBtn, styles.deleteBtn]}>
                                    <Ionicons name="trash-outline" size={20} color="#EF4444" />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                    {trip.notes ? <Text style={styles.notesText} numberOfLines={1}>{trip.notes}</Text> : null}
                </View>

                {/* Main Viewer */}
                <View style={styles.viewerArea}>
                    {hasMedia ? (
                        <FlatList
                            ref={mainListRef}
                            data={trip.media}
                            renderItem={renderMainItem}
                            extraData={currentIndex}
                            keyExtractor={(_, index) => `main-${index}`}
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            snapToInterval={viewerWidth}
                            snapToAlignment="center"
                            decelerationRate="fast"
                            onScroll={handleMainScroll}
                            scrollEventThrottle={16}
                            contentContainerStyle={{ paddingHorizontal: (SCREEN_WIDTH - viewerWidth) / 2 }}
                            getItemLayout={(_, index) => ({
                                length: viewerWidth, offset: viewerWidth * index, index,
                            })}
                        />
                    ) : renderEmptyState()}
                </View>

                {/* Counter */}
                {hasMedia && (
                    <View style={styles.counterBadge}>
                        <Text style={styles.counterText}>{currentIndex + 1} / {trip.media.length}</Text>
                    </View>
                )}

                {/* Thumbnail Strip */}
                {hasMedia && trip.media.length > 1 && (
                    <View style={styles.thumbStrip}>
                        <FlatList
                            data={trip.media}
                            renderItem={renderThumbnail}
                            keyExtractor={(_, index) => `thumb-${index}`}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.thumbContent}
                        />
                    </View>
                )}
            </BlurView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(3,3,12,0.85)' },
    headerBar: {
        paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)',
        backgroundColor: 'rgba(8,8,20,0.9)',
    },
    tripInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tripInfo: { flex: 1, marginRight: 12 },
    tripTitle: { fontSize: 22, fontWeight: '800', color: '#F0F0F0', letterSpacing: -0.3 },
    tripMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    metaText: { color: '#9CA3AF', fontSize: 13 },
    notesText: { color: '#6B7280', fontSize: 12, fontStyle: 'italic', marginTop: 4 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    actionBtn: {
        backgroundColor: 'rgba(0,212,255,0.08)', padding: 8, borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    },
    deleteBtn: { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.15)' },
    closeBtn: {
        backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, borderRadius: 12,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    },
    viewerArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mainMediaContainer: {
        justifyContent: 'center', alignItems: 'center', borderRadius: 12,
        overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.4)',
    },
    media: { width: '100%', height: '100%' },
    counterBadge: {
        position: 'absolute', top: 80, right: 24,
        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 16,
        paddingHorizontal: 12, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)',
    },
    counterText: { color: '#9CA3AF', fontSize: 12, fontWeight: '600' },
    thumbStrip: {
        paddingVertical: 10, borderTopWidth: 1,
        borderTopColor: 'rgba(0,212,255,0.1)', backgroundColor: 'rgba(8,8,20,0.9)',
    },
    thumbContent: { paddingHorizontal: 16, gap: 8 },
    thumbnailContainer: {
        borderRadius: 8, overflow: 'hidden', borderWidth: 2,
        borderColor: 'transparent', opacity: 0.6,
    },
    thumbnailActive: { borderColor: '#00d4ff', opacity: 1 },
    thumbImage: { width: '100%', height: '100%' },
    videoThumbBg: {
        width: '100%', height: '100%', backgroundColor: 'rgba(0,20,40,0.8)',
        justifyContent: 'center', alignItems: 'center',
    },
    emptyState: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
    emptyText: { fontSize: 20, fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginTop: 20 },
    emptySubtext: { fontSize: 13, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 8 },
});

export default MemoryViewer;
