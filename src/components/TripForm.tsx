import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Modal, StyleSheet,
    Alert, ActivityIndicator, ScrollView, Image, useWindowDimensions, Platform,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { TripFormProps, MediaItem, TripTag, TAG_CONFIG, Itinerary } from '../types';
import { useApp } from '../contexts/AppContext';
import { MEDIA_DIR } from '../services/StorageService';

const NOMINATIM_MIN_INTERVAL = 1100;

const TripForm: React.FC<TripFormProps & { itineraries?: Itinerary[] }> = ({ visible, onClose, onSave, editTrip, itineraries }) => {
    const { t, language } = useApp();
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
    const isTablet = SCREEN_WIDTH >= 768;
    const isSmallPhone = SCREEN_WIDTH < 400;

    const [locationQuery, setLocationQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [foundLocation, setFoundLocation] = useState<{
        latitude: number; longitude: number; displayName: string;
    } | null>(null);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [notes, setNotes] = useState('');
    const [media, setMedia] = useState<MediaItem[]>([]);
    const [selectedTags, setSelectedTags] = useState<TripTag[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [dateYear, setDateYear] = useState(new Date().getFullYear());
    const [dateMonth, setDateMonth] = useState(new Date().getMonth());
    const [dateDay, setDateDay] = useState(new Date().getDate());
    const [foundCountry, setFoundCountry] = useState('');
    const [foundCountryCode, setFoundCountryCode] = useState('');
    const [selectedItineraryId, setSelectedItineraryId] = useState<string | undefined>(undefined);

    const lastGeocodingTime = useRef(0);

    useEffect(() => {
        if (editTrip && visible) {
            setTitle(editTrip.title);
            setDate(editTrip.date);
            setNotes(editTrip.notes || '');
            setMedia(editTrip.media);
            setLocationQuery(editTrip.locationName);
            setSelectedTags(editTrip.tags || []);
            setFoundCountry(editTrip.country || '');
            setFoundCountryCode(editTrip.countryCode || '');
            setSelectedItineraryId(editTrip.itineraryId);
            setFoundLocation({
                latitude: editTrip.latitude,
                longitude: editTrip.longitude,
                displayName: editTrip.locationName,
            });
            if (editTrip.date) {
                const parts = editTrip.date.split('-');
                if (parts.length === 3) {
                    setDateYear(parseInt(parts[0], 10));
                    setDateMonth(parseInt(parts[1], 10) - 1);
                    setDateDay(parseInt(parts[2], 10));
                }
            }
        }
    }, [editTrip, visible]);

    const resetForm = () => {
        setLocationQuery(''); setFoundLocation(null); setTitle('');
        setDate(''); setNotes(''); setMedia([]); setSelectedTags([]);
        setIsSearching(false); setIsSaving(false); setShowDatePicker(false);
        setDateYear(new Date().getFullYear());
        setDateMonth(new Date().getMonth());
        setDateDay(new Date().getDate());
        setFoundCountry(''); setFoundCountryCode('');
        setSelectedItineraryId(undefined);
    };

    const handleClose = () => { resetForm(); onClose(); };

    const fetchWithTimeout = async (url: string, timeoutMs = 10000): Promise<Response> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(url, {
                method: 'GET',
                headers: { 'User-Agent': 'TravelSphere/1.0 (travel-app)', 'Accept': 'application/json' },
                signal: controller.signal,
            });
            return res;
        } finally {
            clearTimeout(timer);
        }
    };

    const geocodeWithNominatim = async (query: string): Promise<{ lat: number; lon: number; name: string; country?: string; countryCode?: string } | null> => {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=${language}&addressdetails=1`;
            const response = await fetchWithTimeout(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                const p = data[0];
                const parts = p.display_name.split(', ');
                return {
                    lat: parseFloat(p.lat), lon: parseFloat(p.lon),
                    name: parts.slice(0, 3).join(', '),
                    country: p.address?.country || '',
                    countryCode: p.address?.country_code?.toUpperCase() || '',
                };
            }
        } catch { /* nominatim failed */ }
        return null;
    };

    const geocodeWithPhoton = async (query: string): Promise<{ lat: number; lon: number; name: string } | null> => {
        try {
            const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=1&lang=${language === 'it' ? 'it' : 'en'}`;
            const response = await fetchWithTimeout(url);
            if (!response.ok) return null;
            const data = await response.json();
            if (data?.features?.length > 0) {
                const f = data.features[0];
                const [lon, lat] = f.geometry.coordinates;
                const pr = f.properties;
                const parts = [pr.name, pr.state || pr.county, pr.country].filter(Boolean);
                return { lat, lon, name: parts.slice(0, 3).join(', ') };
            }
        } catch { /* photon failed */ }
        return null;
    };

    const geocodeWithNative = async (query: string): Promise<{ lat: number; lon: number; name: string } | null> => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') return null;
            const coords = await Location.geocodeAsync(query);
            if (coords && coords.length > 0) {
                const { latitude, longitude } = coords[0];
                let displayName = query;
                try {
                    const reverse = await Location.reverseGeocodeAsync({ latitude, longitude });
                    if (reverse && reverse.length > 0) {
                        const r = reverse[0];
                        const parts = [r.city || r.subregion, r.region, r.country].filter(Boolean);
                        if (parts.length > 0) displayName = parts.join(', ');
                    }
                } catch { /* use query */ }
                return { lat: latitude, lon: longitude, name: displayName };
            }
        } catch { /* native unavailable */ }
        return null;
    };

    const handleGeocode = async () => {
        if (!locationQuery.trim()) { Alert.alert(t('error') as string, t('enterLocation') as string); return; }
        const now = Date.now();
        if (now - lastGeocodingTime.current < NOMINATIM_MIN_INTERVAL) {
            return;
        }
        lastGeocodingTime.current = now;
        setIsSearching(true); setFoundLocation(null);
        try {
            // 1. Try Nominatim + Photon in parallel (no permissions needed)
            const [nominatim, photon] = await Promise.all([
                geocodeWithNominatim(locationQuery),
                geocodeWithPhoton(locationQuery),
            ]);
            const httpResult = nominatim || photon;
            if (httpResult) {
                setFoundLocation({ latitude: httpResult.lat, longitude: httpResult.lon, displayName: httpResult.name });
                if ('country' in httpResult && httpResult.country) {
                    setFoundCountry(httpResult.country);
                    setFoundCountryCode(httpResult.countryCode || '');
                }
                if (!title) setTitle(locationQuery);
                return;
            }

            // 2. Fallback: native geocoding (asks location permission only if HTTP failed)
            const nativeResult = await geocodeWithNative(locationQuery);
            if (nativeResult) {
                setFoundLocation({ latitude: nativeResult.lat, longitude: nativeResult.lon, displayName: nativeResult.name });
                if (!title) setTitle(locationQuery);
                return;
            }

            // 3. All 3 methods failed
            Alert.alert(t('locationNotFound') as string, t('locationNotFoundText') as string);
        } catch (error) {
            Alert.alert(t('error') as string, t('searchError') as string);
        } finally {
            setIsSearching(false);
        }
    };

    const ensureMediaDir = async () => {
        if (Platform.OS === 'web') return;
        const dirInfo = await FileSystem.getInfoAsync(MEDIA_DIR);
        if (!dirInfo.exists) await FileSystem.makeDirectoryAsync(MEDIA_DIR, { intermediates: true });
    };

    const compressImage = async (uri: string): Promise<string> => {
        try {
            const result = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1920 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            return result.uri;
        } catch {
            return uri;
        }
    };

    const copyMediaToPersistentStorage = async (items: MediaItem[]): Promise<MediaItem[]> => {
        if (Platform.OS === 'web') return items;
        await ensureMediaDir();
        const copiedMedia: MediaItem[] = [];
        for (const item of items) {
            if (item.uri.startsWith(MEDIA_DIR)) { copiedMedia.push(item); continue; }
            const sourceUri = item.type === 'image' ? await compressImage(item.uri) : item.uri;
            const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}${item.type === 'video' ? '.mp4' : '.jpg'}`;
            const newUri = MEDIA_DIR + filename;
            try {
                await FileSystem.copyAsync({ from: sourceUri, to: newUri });
                copiedMedia.push({ ...item, uri: newUri });
            } catch (error) {
                copiedMedia.push(item);
            }
        }
        return copiedMedia;
    };

    const handlePickImages = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert(t('permissionDenied') as string, t('galleryPermission') as string); return; }
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images', 'videos'] as ImagePicker.MediaType[],
                allowsMultipleSelection: true, quality: 0.8, aspect: [16, 9],
            });
            if (!result.canceled && result.assets) {
                const newMedia: MediaItem[] = result.assets.map((asset) => ({
                    uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image',
                    width: asset.width, height: asset.height,
                }));
                setMedia((prev) => [...prev, ...newMedia]);
            }
        } catch (error) {
            Alert.alert(t('error') as string, t('galleryPermission') as string);
        }
    };

    const handleCameraCapture = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') { Alert.alert(t('permissionDenied') as string, t('cameraPermission') as string); return; }
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images', 'videos'] as ImagePicker.MediaType[],
                quality: 0.8, aspect: [16, 9],
            });
            if (!result.canceled && result.assets) {
                const newMedia: MediaItem[] = result.assets.map((asset) => ({
                    uri: asset.uri, type: asset.type === 'video' ? 'video' : 'image',
                    width: asset.width, height: asset.height,
                }));
                setMedia((prev) => [...prev, ...newMedia]);
            }
        } catch (error) {
            Alert.alert(t('error') as string, t('cameraPermission') as string);
        }
    };

    const removeMedia = (index: number) => setMedia((prev) => prev.filter((_, i) => i !== index));

    const toggleTag = (tag: TripTag) => {
        setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
    };

    const confirmDatePicker = () => {
        const maxDays = new Date(dateYear, dateMonth + 1, 0).getDate();
        const clampedDay = Math.min(dateDay, maxDays);
        const d = `${dateYear}-${String(dateMonth + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
        setDateDay(clampedDay);
        setDate(d);
        setShowDatePicker(false);
    };

    const handleSubmit = async () => {
        if (!foundLocation) { Alert.alert(t('error') as string, t('searchLocation') as string); return; }
        if (!title.trim()) { Alert.alert(t('error') as string, t('enterTitle') as string); return; }
        const lat = foundLocation.latitude;
        const lng = foundLocation.longitude;
        if (lat == null || lng == null || isNaN(lat) || isNaN(lng) ||
            lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            Alert.alert(t('error') as string, t('invalidCoordinates') as string);
            return;
        }
        setIsSaving(true);
        try {
            const persistentMedia = await copyMediaToPersistentStorage(media);
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSave({
                title: title.trim(),
                locationName: foundLocation.displayName,
                latitude: foundLocation.latitude,
                longitude: foundLocation.longitude,
                date: date || new Date().toISOString().split('T')[0],
                notes: notes.trim(),
                media: persistentMedia,
                isFavorite: editTrip?.isFavorite || false,
                tags: selectedTags,
                country: foundCountry || undefined,
                countryCode: foundCountryCode || undefined,
                itineraryId: selectedItineraryId,
            });
            resetForm();
        } catch (error) {
            Alert.alert(t('error') as string, t('saveError') as string);
            setIsSaving(false);
        }
    };

    const isEditMode = !!editTrip;
    const allTags: TripTag[] = ['sea', 'mountain', 'city', 'adventure', 'culture', 'food', 'nature', 'romantic'];

    const dynamicStyles = {
        blurContainer: { width: isTablet ? SCREEN_WIDTH * 0.5 : SCREEN_WIDTH * 0.85, maxWidth: 550, minWidth: 300 },
        scrollContent: { maxHeight: SCREEN_HEIGHT * 0.6 },
        mediaItem: { width: isSmallPhone ? 60 : 80, height: isSmallPhone ? 60 : 80 },
    };

    return (
        <Modal visible={visible} animationType="fade" transparent statusBarTranslucent hardwareAccelerated onRequestClose={handleClose}>
            <View style={styles.overlay}>
                <View style={[styles.blurContainer, dynamicStyles.blurContainer, styles.formContainer]}>
                        <View style={styles.header}>
                            <View style={styles.headerTitle}>
                                <Ionicons name={isEditMode ? 'create' : 'location'} size={isSmallPhone ? 20 : 24} color="#60A5FA" />
                                <Text style={[styles.title, isSmallPhone && { fontSize: 18 }]}>
                                    {isEditMode ? t('editTrip') : t('newTrip')}
                                </Text>
                            </View>
                            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                                <Ionicons name="close" size={isSmallPhone ? 24 : 28} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={[styles.scrollContent, dynamicStyles.scrollContent]}
                            showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {/* Location Search */}
                            <View style={styles.section}>
                                <Text style={styles.label}>{t('whereWere')}</Text>
                                <View style={styles.searchRow}>
                                    <TextInput style={styles.input} placeholder={t('searchPlaceholder') as string}
                                        placeholderTextColor="#6B7280" value={locationQuery}
                                        onChangeText={setLocationQuery} onSubmitEditing={handleGeocode}
                                        returnKeyType="search" autoCorrect={false} />
                                    <TouchableOpacity style={styles.searchBtn} onPress={handleGeocode} disabled={isSearching}>
                                        {isSearching ? <ActivityIndicator color="#fff" size="small" /> :
                                            <Ionicons name="search" size={22} color="#fff" />}
                                    </TouchableOpacity>
                                </View>
                                {foundLocation && (
                                    <View style={styles.foundLocation}>
                                        <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                                        <Text style={styles.foundText} numberOfLines={2}>{foundLocation.displayName}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Trip Details */}
                            <View style={[styles.detailsSection, !foundLocation && styles.disabled]}>
                                <View style={styles.section}>
                                    <Text style={styles.label}>{t('tripTitle')}</Text>
                                    <TextInput style={styles.input} placeholder={t('titlePlaceholder') as string}
                                        placeholderTextColor="#6B7280" value={title} onChangeText={setTitle}
                                        editable={!!foundLocation} />
                                </View>

                                {/* Date Picker */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>{t('date')}</Text>
                                    <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}
                                        disabled={!foundLocation}>
                                        <Ionicons name="calendar-outline" size={18} color="#60A5FA" />
                                        <Text style={[styles.dateButtonText, !date && { color: '#6B7280' }]}>
                                            {date || (t('selectDate') as string)}
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* Tags */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>{t('tags')}</Text>
                                    <View style={styles.tagsRow}>
                                        {allTags.map((tag) => {
                                            const cfg = TAG_CONFIG[tag];
                                            const selected = selectedTags.includes(tag);
                                            return (
                                                <TouchableOpacity key={tag}
                                                    style={[styles.tagChip, selected && { borderColor: cfg.color, backgroundColor: cfg.color + '20' }]}
                                                    onPress={() => toggleTag(tag)} disabled={!foundLocation}>
                                                    <Ionicons name={cfg.icon as any} size={14} color={selected ? cfg.color : '#6B7280'} />
                                                    <Text style={[styles.tagText, selected && { color: cfg.color }]}>
                                                        {t(tag as any)}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                </View>

                                {/* Itinerary selector */}
                                {itineraries && itineraries.length > 0 && (
                                    <View style={styles.section}>
                                        <Text style={styles.label}>{t('addToItinerary')}</Text>
                                        <View style={styles.tagsRow}>
                                            <TouchableOpacity
                                                style={[styles.tagChip, !selectedItineraryId && { borderColor: '#00d4ff', backgroundColor: 'rgba(0,212,255,0.15)' }]}
                                                onPress={() => setSelectedItineraryId(undefined)}
                                                disabled={!foundLocation}>
                                                <Ionicons name="remove-circle-outline" size={14} color={!selectedItineraryId ? '#00d4ff' : '#6B7280'} />
                                                <Text style={[styles.tagText, !selectedItineraryId && { color: '#00d4ff' }]}>{t('noItinerary')}</Text>
                                            </TouchableOpacity>
                                            {itineraries.map((it) => (
                                                <TouchableOpacity key={it.id}
                                                    style={[styles.tagChip, selectedItineraryId === it.id && { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.15)' }]}
                                                    onPress={() => setSelectedItineraryId(it.id)}
                                                    disabled={!foundLocation}>
                                                    <Ionicons name="git-merge-outline" size={14} color={selectedItineraryId === it.id ? '#F59E0B' : '#6B7280'} />
                                                    <Text style={[styles.tagText, selectedItineraryId === it.id && { color: '#F59E0B' }]}>{it.name}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.section}>
                                    <Text style={styles.label}>{t('notes')}</Text>
                                    <TextInput style={[styles.input, styles.notesInput]}
                                        placeholder={t('notesPlaceholder') as string} placeholderTextColor="#6B7280"
                                        value={notes} onChangeText={setNotes} editable={!!foundLocation}
                                        multiline numberOfLines={3} textAlignVertical="top" />
                                </View>

                                {/* Media */}
                                <View style={styles.section}>
                                    <Text style={styles.label}>{t('photosVideos')}</Text>
                                    <View style={styles.mediaPickerRow}>
                                        <TouchableOpacity style={[styles.mediaPicker, { flex: 1 }]}
                                            onPress={handlePickImages} disabled={!foundLocation} activeOpacity={0.7}>
                                            <View style={styles.mediaPickerIcon}>
                                                <Ionicons name="images" size={isSmallPhone ? 18 : 20} color="#60A5FA" />
                                            </View>
                                            <Text style={styles.mediaPickerText}>{t('gallery')}</Text>
                                        </TouchableOpacity>
                                        {Platform.OS !== 'web' && (
                                            <TouchableOpacity style={[styles.mediaPicker, { flex: 1 }]}
                                                onPress={handleCameraCapture} disabled={!foundLocation} activeOpacity={0.7}>
                                                <View style={styles.mediaPickerIcon}>
                                                    <Ionicons name="camera" size={isSmallPhone ? 18 : 20} color="#60A5FA" />
                                                </View>
                                                <Text style={styles.mediaPickerText}>{t('camera')}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {media.length > 0 && (
                                        <ScrollView horizontal style={styles.mediaPreview} showsHorizontalScrollIndicator={false}>
                                            {media.map((item, index) => (
                                                <View key={index} style={[styles.mediaItem, dynamicStyles.mediaItem]}>
                                                    <Image source={{ uri: item.uri }} style={styles.mediaThumb} />
                                                    <TouchableOpacity style={styles.removeMediaBtn} onPress={() => removeMedia(index)}
                                                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                        <Ionicons name="close" size={12} color="#fff" />
                                                    </TouchableOpacity>
                                                    {item.type === 'video' && (
                                                        <View style={styles.videoTag}><Text style={styles.videoTagText}>VIDEO</Text></View>
                                                    )}
                                                </View>
                                            ))}
                                        </ScrollView>
                                    )}
                                </View>

                                <TouchableOpacity
                                    style={[styles.submitBtn, (!foundLocation || isSaving) && styles.submitBtnDisabled]}
                                    onPress={handleSubmit} disabled={!foundLocation || isSaving} activeOpacity={0.8}>
                                    {isSaving ? <ActivityIndicator color="#fff" size="small" /> : (
                                        <>
                                            <Ionicons name={isEditMode ? 'checkmark' : 'pin'} size={20} color="#fff" />
                                            <Text style={styles.submitBtnText}>
                                                {isEditMode ? t('saveChanges') : t('addPin')}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                </View>

                {/* Custom Date Picker Modal */}
                {showDatePicker && (
                    <Modal visible transparent animationType="fade" statusBarTranslucent hardwareAccelerated>
                        <View style={styles.datePickerOverlay}>
                            <View style={styles.datePickerCard}>
                                <Text style={styles.datePickerTitle}>{t('selectDate')}</Text>
                                <View style={styles.datePickerRow}>
                                    {/* Year */}
                                    <View style={styles.datePickerCol}>
                                        <TouchableOpacity onPress={() => setDateYear(y => y + 1)}><Ionicons name="chevron-up" size={24} color="#60A5FA" /></TouchableOpacity>
                                        <Text style={styles.datePickerValue}>{dateYear}</Text>
                                        <TouchableOpacity onPress={() => setDateYear(y => y - 1)}><Ionicons name="chevron-down" size={24} color="#60A5FA" /></TouchableOpacity>
                                    </View>
                                    <Text style={styles.datePickerSep}>-</Text>
                                    {/* Month */}
                                    <View style={styles.datePickerCol}>
                                        <TouchableOpacity onPress={() => setDateMonth(m => m < 11 ? m + 1 : 0)}><Ionicons name="chevron-up" size={24} color="#60A5FA" /></TouchableOpacity>
                                        <Text style={styles.datePickerValue}>{String(dateMonth + 1).padStart(2, '0')}</Text>
                                        <TouchableOpacity onPress={() => setDateMonth(m => m > 0 ? m - 1 : 11)}><Ionicons name="chevron-down" size={24} color="#60A5FA" /></TouchableOpacity>
                                    </View>
                                    <Text style={styles.datePickerSep}>-</Text>
                                    {/* Day */}
                                    <View style={styles.datePickerCol}>
                                        <TouchableOpacity onPress={() => setDateDay(d => { const max = new Date(dateYear, dateMonth + 1, 0).getDate(); return d < max ? d + 1 : 1; })}><Ionicons name="chevron-up" size={24} color="#60A5FA" /></TouchableOpacity>
                                        <Text style={styles.datePickerValue}>{String(dateDay).padStart(2, '0')}</Text>
                                        <TouchableOpacity onPress={() => setDateDay(d => { const max = new Date(dateYear, dateMonth + 1, 0).getDate(); return d > 1 ? d - 1 : max; })}><Ionicons name="chevron-down" size={24} color="#60A5FA" /></TouchableOpacity>
                                    </View>
                                </View>
                                <View style={styles.datePickerButtons}>
                                    <TouchableOpacity style={styles.datePickerCancel} onPress={() => setShowDatePicker(false)}>
                                        <Text style={styles.datePickerCancelText}>{t('cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.datePickerConfirm} onPress={confirmDatePicker}>
                                        <Text style={styles.datePickerConfirmText}>{t('confirm')}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    blurContainer: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    formContainer: { padding: 20, backgroundColor: 'rgba(15,15,20,0.7)' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '700', color: '#fff' },
    closeBtn: { padding: 8, marginRight: -8 },
    scrollContent: { flexGrow: 0 },
    section: { marginBottom: 14 },
    label: { fontSize: 13, color: '#9CA3AF', marginBottom: 8, fontWeight: '500' },
    searchRow: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#fff', fontSize: 15 },
    notesInput: { minHeight: 70, paddingTop: 12 },
    searchBtn: { backgroundColor: '#3B82F6', borderRadius: 12, width: 48, justifyContent: 'center', alignItems: 'center' },
    foundLocation: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, paddingHorizontal: 4 },
    foundText: { color: '#10B981', fontSize: 13, flex: 1 },
    detailsSection: { opacity: 1 },
    disabled: { opacity: 0.5 },
    dateButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    dateButtonText: { color: '#fff', fontSize: 15 },
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tagChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)' },
    tagText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
    mediaPickerRow: { flexDirection: 'row', gap: 10 },
    mediaPicker: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.4)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 12 },
    mediaPickerIcon: { backgroundColor: 'rgba(96,165,250,0.2)', padding: 6, borderRadius: 8 },
    mediaPickerText: { color: '#9CA3AF', fontSize: 13 },
    mediaPreview: { marginTop: 12 },
    mediaItem: { marginRight: 10, borderRadius: 10, overflow: 'hidden', position: 'relative' },
    mediaThumb: { width: '100%', height: '100%' },
    removeMediaBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(239,68,68,0.9)', borderRadius: 10, padding: 4 },
    videoTag: { position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    videoTagText: { color: '#fff', fontSize: 8, fontWeight: '700' },
    submitBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
    submitBtnDisabled: { backgroundColor: '#374151' },
    submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    datePickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
    datePickerCard: { backgroundColor: '#1a1a2e', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,212,255,0.2)', padding: 24, minWidth: 280 },
    datePickerTitle: { color: '#F0F0F0', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
    datePickerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
    datePickerCol: { alignItems: 'center', gap: 6 },
    datePickerValue: { color: '#00d4ff', fontSize: 28, fontWeight: '800', minWidth: 50, textAlign: 'center' },
    datePickerSep: { color: '#4B5563', fontSize: 28, fontWeight: '300' },
    datePickerButtons: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 24 },
    datePickerCancel: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
    datePickerCancelText: { color: '#9CA3AF', fontSize: 15, fontWeight: '500' },
    datePickerConfirm: { paddingVertical: 10, paddingHorizontal: 24, borderRadius: 12, backgroundColor: '#3B82F6' },
    datePickerConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});

export default TripForm;
