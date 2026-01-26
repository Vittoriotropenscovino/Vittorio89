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
    FlatList,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Ionicons } from '@expo/vector-icons';
import { TripFormProps, MediaItem } from '../types';
import logger from '../utils/logger';

// Interface for geocoding results
interface GeocodingSearchResult {
    lat: string;
    lon: string;
    display_name: string;
    place_id: number;
}

// Directory for persistent media storage
const MEDIA_DIR = FileSystem.documentDirectory + 'media/';

const TripForm: React.FC<TripFormProps> = ({ visible, onClose, onSave }) => {
    // Use responsive dimensions
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
    } | null>(null);
    const [searchResults, setSearchResults] = useState<GeocodingSearchResult[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);

    // Reset form state
    const resetForm = () => {
        setLocationQuery('');
        setFoundLocation(null);
        setSearchResults([]);
        setShowResults(false);
        setTitle('');
        setDate('');
        setMedia([]);
        setIsSearching(false);
        setIsSaving(false);
    };

    // Handle close
    const handleClose = () => {
        resetForm();
        onClose();
    };

    // Geocode location using Nominatim (OpenStreetMap) - works on all platforms
    // Now returns multiple results for user selection
    const geocodeWithNominatim = async (query: string): Promise<GeocodingSearchResult[]> => {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&accept-language=it`,
            {
                headers: {
                    'User-Agent': 'TravelSphere/1.0',
                },
            }
        );
        if (!response.ok) {
            throw new Error('Geocoding request failed');
        }
        return response.json();
    };

    const handleGeocode = async () => {
        if (!locationQuery.trim()) {
            Alert.alert('Errore', 'Inserisci un nome di luogo da cercare.');
            return;
        }

        setIsSearching(true);
        setFoundLocation(null);
        setSearchResults([]);
        setShowResults(false);

        try {
            const results = await geocodeWithNominatim(locationQuery);

            if (results && results.length > 0) {
                setSearchResults(results);
                setShowResults(true);
            } else {
                Alert.alert(
                    'Luogo non trovato',
                    'Non è stato possibile trovare il luogo specificato. Prova con un nome diverso (es. "Roma, Italia").',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            logger.error('Geocoding error:', error);
            Alert.alert(
                'Errore',
                'Si è verificato un errore durante la ricerca. Controlla la connessione e riprova.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsSearching(false);
        }
    };

    // Handle selection of a geocoding result
    const handleSelectLocation = (result: GeocodingSearchResult) => {
        const nameParts = result.display_name.split(', ');
        const displayName = nameParts.slice(0, 3).join(', ');

        setFoundLocation({
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon),
            displayName,
        });

        setShowResults(false);

        // Auto-fill title if empty
        if (!title) {
            setTitle(nameParts[0]);
        }
    };

    // Ensure media directory exists (only on native platforms)
    const ensureMediaDir = async () => {
        if (Platform.OS === 'web') return; // FileSystem not fully supported on web
        const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
        }
    };

    // Compress image for storage optimization
    const compressImage = async (uri: string): Promise<string> => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1920 } }], // Max width 1920px, maintains aspect ratio
                {
                    compress: 0.7, // 70% quality
                    format: ImageManipulator.SaveFormat.JPEG,
                }
            );
            return result.uri;
        } catch (error) {
            logger.warn('Image compression failed, using original:', error);
            return uri;
        }
    };

    // Copy media to persistent storage (native only, web uses original URIs)
    // Now includes image compression for optimization
    const copyMediaToPersistentStorage = async (items: MediaItem[]): Promise<MediaItem[]> => {
        // On web, just return original items - FileSystem is not fully supported
        if (Platform.OS === 'web') {
            return items;
        }

        await ensureMediaDir();

        const copiedMedia: MediaItem[] = [];

        for (const item of items) {
            // Skip if already in our directory
            if (item.uri.startsWith(MEDIA_DIR)) {
                copiedMedia.push(item);
                continue;
            }

            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}${item.type === 'video' ? '.mp4' : '.jpg'}`;
            const newUri = MEDIA_DIR + filename;

            try {
                let sourceUri = item.uri;

                // Compress images before saving
                if (item.type === 'image') {
                    sourceUri = await compressImage(item.uri);
                }

                await FileSystem.copyAsync({
                    from: sourceUri,
                    to: newUri,
                });

                copiedMedia.push({
                    ...item,
                    uri: newUri,
                });
            } catch (error) {
                logger.error('Error copying media:', error);
                // Keep original URI if copy fails
                copiedMedia.push(item);
            }
        }

        return copiedMedia;
    };

    // Pick images from gallery
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
                aspect: [16, 9],
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
            logger.error('Image picker error:', error);
            Alert.alert('Errore', 'Impossibile selezionare le immagini.');
        }
    };

    // Remove media item
    const removeMedia = (index: number) => {
        setMedia((prev) => prev.filter((_, i) => i !== index));
    };

    // Submit form
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
            // Copy media to persistent storage
            const persistentMedia = await copyMediaToPersistentStorage(media);

            onSave({
                title: title.trim(),
                locationName: foundLocation.displayName,
                latitude: foundLocation.latitude,
                longitude: foundLocation.longitude,
                date: date || new Date().toISOString().split('T')[0],
                media: persistentMedia,
            });

            resetForm();
        } catch (error) {
            logger.error('Save error:', error);
            Alert.alert('Errore', 'Impossibile salvare il viaggio. Riprova.');
            setIsSaving(false);
        }
    };

    // Dynamic styles based on screen size
    const dynamicStyles = {
        blurContainer: {
            width: isTablet ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.85,
            maxWidth: 550,
            minWidth: 300,
        },
        scrollContent: {
            maxHeight: SCREEN_HEIGHT * 0.5,
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
                        {/* Header */}
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

                                {/* Search Results List */}
                                {showResults && searchResults.length > 0 && (
                                    <View style={styles.resultsContainer}>
                                        <Text style={styles.resultsTitle}>
                                            Seleziona un luogo ({searchResults.length} risultati):
                                        </Text>
                                        {searchResults.map((result) => (
                                            <TouchableOpacity
                                                key={result.place_id}
                                                style={styles.resultItem}
                                                onPress={() => handleSelectLocation(result)}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="location-outline" size={16} color="#60A5FA" />
                                                <Text style={styles.resultText} numberOfLines={2}>
                                                    {result.display_name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                {foundLocation && (
                                    <View style={styles.foundLocation}>
                                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                        <Text style={styles.foundText} numberOfLines={2}>
                                            {foundLocation.displayName}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setFoundLocation(null);
                                                setShowResults(true);
                                            }}
                                            style={styles.changeLocationBtn}
                                        >
                                            <Text style={styles.changeLocationText}>Cambia</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Trip Details - Enabled only after location found */}
                            <View style={[
                                styles.detailsSection,
                                !foundLocation && styles.disabled
                            ]}>
                                {/* Title */}
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

                                {/* Date */}
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

                                    {/* Media Preview */}
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
    changeLocationBtn: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    changeLocationText: {
        color: '#60A5FA',
        fontSize: 12,
        fontWeight: '500',
    },
    resultsContainer: {
        marginTop: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        padding: 10,
        maxHeight: 150,
    },
    resultsTitle: {
        color: '#9CA3AF',
        fontSize: 12,
        marginBottom: 8,
    },
    resultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(96, 165, 250, 0.1)',
        marginBottom: 6,
    },
    resultText: {
        color: '#E5E7EB',
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
