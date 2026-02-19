import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Alert,
    ActivityIndicator,
    ScrollView,
    Image,
    useWindowDimensions,
    Platform,
    Switch,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { TripFormProps, MediaItem, Itinerary } from '../types';
import { geocodeWithNominatim } from '../utils/geocoding';

// Directory for persistent media storage
const MEDIA_DIR = FileSystem.documentDirectory + 'media/';

const TripForm: React.FC<TripFormProps> = ({ visible, onClose, onSave, itineraries = [] }) => {
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;
    const isSmallPhone = SCREEN_WIDTH < 400;

    const [locationQuery, setLocationQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [foundLocation, setFoundLocation] = useState<{
        latitude: number;
        longitude: number;
        displayName: string;
        country?: string;
        countryCode?: string;
    } | null>(null);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);

    // Itinerary state
    const [linkToItinerary, setLinkToItinerary] = useState(false);
    const [selectedItineraryId, setSelectedItineraryId] = useState<string | null>(null);
    const [newItineraryName, setNewItineraryName] = useState('');

    const resetForm = () => {
        setLocationQuery('');
        setFoundLocation(null);
        setTitle('');
        setDate('');
        setMedia([]);
        setIsSearching(false);
        setIsSaving(false);
        setLinkToItinerary(false);
        setSelectedItineraryId(null);
        setNewItineraryName('');
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    const handleGeocode = async () => {
        if (!locationQuery.trim()) {
            Alert.alert('Errore', 'Inserisci un nome di luogo da cercare.');
            return;
        }

        setIsSearching(true);
        setFoundLocation(null);

        try {
            const results = await geocodeWithNominatim(locationQuery);

            if (results && results.length > 0) {
                const place = results[0];
                const nameParts = place.display_name.split(', ');
                const displayName = nameParts.slice(0, 3).join(', ');

                const country = place.address?.country || nameParts[nameParts.length - 1] || 'Sconosciuto';
                const countryCode = place.address?.country_code || undefined;

                setFoundLocation({
                    latitude: parseFloat(place.lat),
                    longitude: parseFloat(place.lon),
                    displayName,
                    country,
                    countryCode,
                });

                if (!title) {
                    setTitle(locationQuery);
                }
            } else {
                Alert.alert(
                    'Luogo non trovato',
                    'Non è stato possibile trovare il luogo specificato. Prova con un nome diverso (es. "Roma, Italia").',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            Alert.alert(
                'Errore',
                'Si è verificato un errore durante la ricerca. Controlla la connessione e riprova.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSearching(false);
        }
    };

    const ensureMediaDir = async () => {
        if (Platform.OS === 'web') return;
        const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
        }
    };

    const getFileExtension = (uri: string, type: string): string => {
        const match = uri.match(/\.(\w+)$/);
        if (match) return '.' + match[1].toLowerCase();
        return type === 'video' ? '.mp4' : '.jpg';
    };

    const copyMediaToPersistentStorage = async (items: MediaItem[]): Promise<MediaItem[]> => {
        if (Platform.OS === 'web') return items;
        await ensureMediaDir();

        const copiedMedia: MediaItem[] = [];
        for (const item of items) {
            if (item.uri.startsWith(MEDIA_DIR)) {
                copiedMedia.push(item);
                continue;
            }

            const ext = getFileExtension(item.uri, item.type);
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}${ext}`;
            const newUri = MEDIA_DIR + filename;

            try {
                await FileSystem.copyAsync({ from: item.uri, to: newUri });
                copiedMedia.push({ ...item, uri: newUri });
            } catch (error) {
                console.error('Error copying media:', error);
                copiedMedia.push(item);
            }
        }
        return copiedMedia;
    };

    const handlePickImages = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permesso negato',
                    'È necessario il permesso per accedere alla galleria.',
                    [{ text: 'OK' }]
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.All,
                allowsMultipleSelection: true,
                quality: 0.8,
                videoMaxDuration: 60,
            });

            if (!result.canceled && result.assets) {
                const newMedia: MediaItem[] = result.assets.map((asset) => ({
                    uri: asset.uri,
                    type: asset.type === 'video' ? 'video' : 'image',
                    width: asset.width,
                    height: asset.height,
                }));
                setMedia((prev) => [...prev, ...newMedia]);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Errore', 'Impossibile selezionare le immagini.');
        }
    };

    const removeMedia = (index: number) => {
        setMedia((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!foundLocation) {
            Alert.alert('Errore', 'Cerca e seleziona prima un luogo.');
            return;
        }
        if (!title.trim()) {
            Alert.alert('Errore', 'Inserisci un titolo per il viaggio.');
            return;
        }

        setIsSaving(true);
        try {
            const persistentMedia = await copyMediaToPersistentStorage(media);

            const itineraryInfo = linkToItinerary ? {
                itineraryId: selectedItineraryId || undefined,
                newItineraryName: (!selectedItineraryId && newItineraryName.trim()) ? newItineraryName.trim() : undefined,
            } : undefined;

            onSave({
                title: title.trim(),
                locationName: foundLocation.displayName,
                latitude: foundLocation.latitude,
                longitude: foundLocation.longitude,
                date: date || new Date().toISOString().split('T')[0],
                media: persistentMedia,
                country: foundLocation.country,
                countryCode: foundLocation.countryCode,
            }, itineraryInfo);

            resetForm();
        } catch (error) {
            console.error('Save error:', error);
            Alert.alert('Errore', 'Impossibile salvare il viaggio. Riprova.');
            setIsSaving(false);
        }
    };

    const dynamicStyles = {
        blurContainer: {
            width: isTablet ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.85,
            maxWidth: 550,
            minWidth: 300,
        },
        scrollContent: {
            maxHeight: SCREEN_HEIGHT * 0.55,
        },
        mediaItem: {
            width: isSmallPhone ? 60 : 80,
            height: isSmallPhone ? 60 : 80,
        },
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            statusBarTranslucent
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <BlurView
                    intensity={40}
                    style={[styles.blurContainer, dynamicStyles.blurContainer]}
                    tint="dark"
                >
                    <View style={styles.formContainer}>
                        <View style={styles.header}>
                            <View style={styles.headerTitle}>
                                <Ionicons name="location" size={isSmallPhone ? 20 : 24} color="#60A5FA" />
                                <Text style={[styles.title, isSmallPhone && { fontSize: 18 }]}>Nuovo Viaggio</Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={isSmallPhone ? 24 : 28} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={[styles.scrollContent, dynamicStyles.scrollContent]}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                        >
                            {/* Location Search */}
                            <View style={styles.section}>
                                <Text style={styles.label}>Dove sei stato?</Text>
                                <View style={styles.searchRow}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="es. New York, Bali, Parigi..."
                                        placeholderTextColor="#6B7280"
                                        value={locationQuery}
                                        onChangeText={setLocationQuery}
                                        onSubmitEditing={handleGeocode}
                                        returnKeyType="search"
                                        autoCorrect={false}
                                    />
                                    <TouchableOpacity
                                        style={styles.searchBtn}
                                        onPress={handleGeocode}
                                        disabled={isSearching}
                                    >
                                        {isSearching ? (
                                            <ActivityIndicator color="#fff" size="small" />
                                        ) : (
                                            <Ionicons name="search" size={22} color="#fff" />
                                        )}
                                    </TouchableOpacity>
                                </View>

                                {foundLocation && (
                                    <View style={styles.foundLocation}>
                                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                        <Text style={styles.foundText} numberOfLines={2}>
                                            {foundLocation.displayName}
                                        </Text>
                                    </View>
                                )}
                            </View>

                            {/* Trip Details */}
                            <View style={[styles.detailsSection, !foundLocation && styles.disabled]}>
                                <View style={styles.section}>
                                    <Text style={styles.label}>Titolo del viaggio</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Vacanza estiva 2024"
                                        placeholderTextColor="#6B7280"
                                        value={title}
                                        onChangeText={setTitle}
                                        editable={!!foundLocation}
                                    />
                                </View>

                                <View style={styles.section}>
                                    <Text style={styles.label}>Data</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor="#6B7280"
                                        value={date}
                                        onChangeText={setDate}
                                        editable={!!foundLocation}
                                        keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                                    />
                                </View>

                                {/* Media Picker */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>Foto e Video</Text>
                                    <TouchableOpacity
                                        style={styles.mediaPicker}
                                        onPress={handlePickImages}
                                        disabled={!foundLocation}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.mediaPickerIcon}>
                                            <Ionicons name="images" size={isSmallPhone ? 20 : 24} color="#60A5FA" />
                                        </View>
                                        <Text style={styles.mediaPickerText}>
                                            Seleziona dalla galleria...
                                        </Text>
                                    </TouchableOpacity>

                                    {media.length > 0 && (
                                        <ScrollView
                                            horizontal
                                            style={styles.mediaPreview}
                                            showsHorizontalScrollIndicator={false}
                                        >
                                            {media.map((item, index) => (
                                                <View key={index} style={[styles.mediaItem, dynamicStyles.mediaItem]}>
                                                    <Image
                                                        source={{ uri: item.uri }}
                                                        style={styles.mediaThumb}
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.removeMediaBtn}
                                                        onPress={() => removeMedia(index)}
                                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                    >
                                                        <Ionicons name="close" size={12} color="#fff" />
                                                    </TouchableOpacity>
                                                    {item.type === 'video' && (
                                                        <View style={styles.videoTag}>
                                                            <Text style={styles.videoTagText}>VIDEO</Text>
                                                        </View>
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>

                                {/* Itinerary Section */}
                                <View style={styles.section}>
                                    <View style={styles.itineraryToggleRow}>
                                        <View style={styles.itineraryToggleLabel}>
                                            <Ionicons name="git-branch-outline" size={18} color="#F59E0B" />
                                            <Text style={styles.label}>Collega a un itinerario</Text>
                                        </View>
                                        <Switch
                                            value={linkToItinerary}
                                            onValueChange={setLinkToItinerary}
                                            trackColor={{ false: '#374151', true: 'rgba(245, 158, 11, 0.4)' }}
                                            thumbColor={linkToItinerary ? '#F59E0B' : '#6B7280'}
                                        />
                                    </View>

                                    {linkToItinerary && (
                                        <View style={styles.itineraryOptions}>
                                            {itineraries.length > 0 && (
                                                <>
                                                    <Text style={styles.itinerarySubLabel}>Itinerari esistenti:</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itineraryChips}>
                                                        {itineraries.map((itin) => (
                                                            <TouchableOpacity
                                                                key={itin.id}
                                                                style={[
                                                                    styles.itineraryChip,
                                                                    selectedItineraryId === itin.id && styles.itineraryChipActive,
                                                                ]}
                                                                onPress={() => {
                                                                    setSelectedItineraryId(
                                                                        selectedItineraryId === itin.id ? null : itin.id
                                                                    );
                                                                    if (selectedItineraryId !== itin.id) {
                                                                        setNewItineraryName('');
                                                                    }
                                                                }}
                                                            >
                                                                <Ionicons
                                                                    name="git-branch-outline"
                                                                    size={14}
                                                                    color={selectedItineraryId === itin.id ? '#F59E0B' : '#9CA3AF'}
                                                                />
                                                                <Text style={[
                                                                    styles.itineraryChipText,
                                                                    selectedItineraryId === itin.id && styles.itineraryChipTextActive,
                                                                ]}>
                                                                    {itin.name}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </ScrollView>
                                                    <Text style={styles.itinerarySubLabel}>Oppure crea nuovo:</Text>
                                                </>
                                            )}
                                            {!itineraries.length && (
                                                <Text style={styles.itinerarySubLabel}>Nome nuovo itinerario:</Text>
                                            )}
                                            <TextInput
                                                style={[styles.input, styles.itineraryInput]}
                                                placeholder="es. Tour Giappone 2024"
                                                placeholderTextColor="#6B7280"
                                                value={newItineraryName}
                                                onChangeText={(text) => {
                                                    setNewItineraryName(text);
                                                    if (text.trim()) setSelectedItineraryId(null);
                                                }}
                                            />
                                        </View>
                                    )}
                                </View>

                                {/* Submit Button */}
                                <TouchableOpacity
                                    style={[
                                        styles.submitBtn,
                                        (!foundLocation || isSaving) && styles.submitBtnDisabled
                                    ]}
                                    onPress={handleSubmit}
                                    disabled={!foundLocation || isSaving}
                                    activeOpacity={0.8}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator color="#fff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="pin" size={20} color="#fff" />
                                            <Text style={styles.submitBtnText}>Aggiungi Pin</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
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
    blurContainer: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    formContainer: {
        padding: 20,
        backgroundColor: 'rgba(15, 15, 20, 0.7)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
    },
    closeBtn: {
        padding: 8,
        marginRight: -8,
    },
    scrollContent: {
        flexGrow: 0,
    },
    section: {
        marginBottom: 14,
    },
    label: {
        fontSize: 13,
        color: '#9CA3AF',
        marginBottom: 8,
        fontWeight: '500',
    },
    searchRow: {
        flexDirection: 'row',
        gap: 10,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 15,
    },
    searchBtn: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        width: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    foundLocation: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 10,
        paddingHorizontal: 4,
    },
    foundText: {
        color: '#10B981',
        fontSize: 13,
        flex: 1,
    },
    detailsSection: {
        opacity: 1,
    },
    disabled: {
        opacity: 0.5,
    },
    mediaPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 12,
        padding: 14,
    },
    mediaPickerIcon: {
        backgroundColor: 'rgba(96, 165, 250, 0.2)',
        padding: 8,
        borderRadius: 10,
    },
    mediaPickerText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    mediaPreview: {
        marginTop: 12,
    },
    mediaItem: {
        marginRight: 10,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
    },
    mediaThumb: {
        width: '100%',
        height: '100%',
    },
    removeMediaBtn: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        borderRadius: 10,
        padding: 4,
    },
    videoTag: {
        position: 'absolute',
        bottom: 4,
        left: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    videoTagText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: '700',
    },
    // Itinerary styles
    itineraryToggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itineraryToggleLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    itineraryOptions: {
        marginTop: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.05)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.15)',
    },
    itinerarySubLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginBottom: 8,
    },
    itineraryChips: {
        marginBottom: 12,
    },
    itineraryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    itineraryChipActive: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    itineraryChipText: {
        color: '#9CA3AF',
        fontSize: 13,
        fontWeight: '500',
    },
    itineraryChipTextActive: {
        color: '#F59E0B',
    },
    itineraryInput: {
        borderColor: 'rgba(245, 158, 11, 0.2)',
    },
    submitBtn: {
        backgroundColor: '#3B82F6',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 8,
    },
    submitBtnDisabled: {
        backgroundColor: '#374151',
    },
    submitBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default TripForm;
