import React from 'react';
import { Modal, View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Trip, TAG_CONFIG } from '../types';

interface Props {
  visible: boolean;
  trips: Trip[];
  onSelect: (trip: Trip) => void;
  onClose: () => void;
  t: (key: string) => string;
}

export default function PinSelector({ visible, trips, onSelect, onClose, t }: Props) {
  if (!visible || trips.length === 0) return null;

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity
      style={styles.tripRow}
      onPress={() => { onSelect(item); onClose(); }}
      activeOpacity={0.7}
    >
      <View style={[styles.pinDot, { backgroundColor: item.isWishlist ? '#EC4899' : '#EF4444' }]} />
      <View style={styles.tripInfo}>
        <Text style={styles.tripTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.tripSubtitle} numberOfLines={1}>
          {item.locationName}{item.date ? ' · ' + item.date : ''}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {item.tags.slice(0, 3).map((tag, i) => (
              <View key={i} style={[styles.tag, { backgroundColor: (TAG_CONFIG[tag]?.color || '#888') + '30' }]}>
                <Text style={[styles.tagText, { color: TAG_CONFIG[tag]?.color || '#888' }]}>
                  {t(tag) || tag}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      {item.isFavorite && <Ionicons name="star" size={16} color="#F59E0B" style={{ marginRight: 4 }} />}
      <Ionicons name="chevron-forward" size={18} color="#6B7280" />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <Ionicons name="location" size={20} color="#00d4ff" />
            <Text style={styles.headerTitle}>{t('selectTrip')}</Text>
            <Text style={styles.headerCount}>
              {trips.length} {t('tripsInArea')}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={trips}
            renderItem={renderTrip}
            keyExtractor={(item) => item.id}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center',
  },
  container: {
    backgroundColor: 'rgba(15,15,25,0.97)', borderRadius: 16,
    width: '70%', maxWidth: 450, maxHeight: '80%',
    borderWidth: 1, borderColor: 'rgba(0,212,255,0.15)', overflow: 'hidden',
  },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(0,212,255,0.1)', gap: 8,
  },
  headerTitle: { color: '#F0F0F0', fontSize: 16, fontWeight: '600', flex: 1 },
  headerCount: { color: '#6B7280', fontSize: 12 },
  closeBtn: { padding: 4 },
  list: { maxHeight: 300 },
  tripRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', gap: 10,
  },
  pinDot: { width: 10, height: 10, borderRadius: 5 },
  tripInfo: { flex: 1 },
  tripTitle: { color: '#F0F0F0', fontSize: 15, fontWeight: '500' },
  tripSubtitle: { color: '#9CA3AF', fontSize: 12, marginTop: 2 },
  tagsRow: { flexDirection: 'row', marginTop: 4, gap: 4 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: 10, fontWeight: '500' },
});
