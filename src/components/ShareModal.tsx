import React from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    TouchableOpacity,
    Share,
    Alert,
    useWindowDimensions,
    Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { ShareModalProps } from '../types';

const ShareModal: React.FC<ShareModalProps> = ({ trip, visible, onClose }) => {
    const { width: SCREEN_WIDTH } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;

    if (!trip) return null;

    const handleShareText = async () => {
        try {
            const message = [
                `${trip.title}`,
                `📍 ${trip.locationName}`,
                `📅 ${trip.date}`,
                '',
                'Condiviso da TravelSphere 🌍',
            ].join('\n');

            await Share.share({
                message,
                title: trip.title,
            });
        } catch (error) {
            if ((error as any)?.message !== 'User did not share') {
                Alert.alert('Errore', 'Impossibile condividere il viaggio.');
            }
        }
    };

    const handleShareWithMedia = async () => {
        try {
            const imageMedia = trip.media.find(m => m.type === 'image');
            const message = [
                `${trip.title}`,
                `📍 ${trip.locationName}`,
                `📅 ${trip.date}`,
                '',
                `📸 ${trip.media.length} ${trip.media.length === 1 ? 'ricordo' : 'ricordi'}`,
                '',
                'Condiviso da TravelSphere 🌍',
            ].join('\n');

            if (Platform.OS !== 'web' && imageMedia) {
                await Share.share({
                    message,
                    title: trip.title,
                    url: imageMedia.uri,
                });
            } else {
                await Share.share({
                    message,
                    title: trip.title,
                });
            }
        } catch (error) {
            if ((error as any)?.message !== 'User did not share') {
                Alert.alert('Errore', 'Impossibile condividere.');
            }
        }
    };

    const modalWidth = isTablet ? SCREEN_WIDTH * 0.4 : SCREEN_WIDTH * 0.8;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <BlurView
                    intensity={50}
                    style={[styles.container, { width: modalWidth, maxWidth: 450 }]}
                    tint="dark"
                >
                    <View style={styles.content}>
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerLeft}>
                                <Ionicons name="share-social" size={24} color="#60A5FA" />
                                <Text style={styles.headerTitle}>Condividi Viaggio</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        {/* Trip summary card */}
                        <View style={styles.tripCard}>
                            <Text style={styles.tripTitle} numberOfLines={1}>{trip.title}</Text>
                            <View style={styles.tripMeta}>
                                <View style={styles.metaItem}>
                                    <Ionicons name="location" size={14} color="#60A5FA" />
                                    <Text style={styles.metaText} numberOfLines={1}>{trip.locationName}</Text>
                                </View>
                                <View style={styles.metaItem}>
                                    <Ionicons name="calendar" size={14} color="#60A5FA" />
                                    <Text style={styles.metaText}>{trip.date}</Text>
                                </View>
                                {trip.media.length > 0 && (
                                    <View style={styles.metaItem}>
                                        <Ionicons name="images" size={14} color="#60A5FA" />
                                        <Text style={styles.metaText}>
                                            {trip.media.length} {trip.media.length === 1 ? 'file' : 'file'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* Share buttons */}
                        <View style={styles.shareButtons}>
                            <TouchableOpacity
                                style={styles.shareBtn}
                                onPress={handleShareText}
                                activeOpacity={0.7}
                            >
                                <View style={styles.shareBtnIcon}>
                                    <Ionicons name="chatbubble-outline" size={22} color="#60A5FA" />
                                </View>
                                <View style={styles.shareBtnContent}>
                                    <Text style={styles.shareBtnTitle}>Condividi Testo</Text>
                                    <Text style={styles.shareBtnDesc}>Invia i dettagli del viaggio</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                            </TouchableOpacity>

                            {trip.media.length > 0 && (
                                <TouchableOpacity
                                    style={styles.shareBtn}
                                    onPress={handleShareWithMedia}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.shareBtnIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                        <Ionicons name="image-outline" size={22} color="#10B981" />
                                    </View>
                                    <View style={styles.shareBtnContent}>
                                        <Text style={styles.shareBtnTitle}>Condividi con Foto</Text>
                                        <Text style={styles.shareBtnDesc}>Includi la prima foto del viaggio</Text>
                                    </View>
                                    <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    content: {
        padding: 20,
        backgroundColor: 'rgba(15, 15, 20, 0.7)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    closeBtn: {
        padding: 6,
    },
    tripCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    tripTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F9FAFB',
        marginBottom: 10,
    },
    tripMeta: {
        gap: 6,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaText: {
        color: '#9CA3AF',
        fontSize: 13,
        flex: 1,
    },
    shareButtons: {
        gap: 10,
    },
    shareBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
        padding: 14,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    shareBtnIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(96, 165, 250, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareBtnContent: {
        flex: 1,
    },
    shareBtnTitle: {
        color: '#F9FAFB',
        fontSize: 15,
        fontWeight: '600',
    },
    shareBtnDesc: {
        color: '#6B7280',
        fontSize: 12,
        marginTop: 2,
    },
});

export default ShareModal;
