import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  useWindowDimensions, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { TranslationKey } from '../i18n/translations';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALL_ORIENTATIONS, useOrientation } from '../hooks/useOrientation';
import { MODAL_BACKDROP } from '../utils/surfaces';

interface Props {
  visible: boolean;
  onClose: () => void;
  price: string;
  onPurchase: () => Promise<boolean>;
  onRestore: () => Promise<boolean>;
  freeLimit: number;
}

const PaywallScreen: React.FC<Props> = ({ visible, onClose, price, onPurchase, onRestore, freeLimit }) => {
  const { t } = useApp();
  const { width: screenW } = useWindowDimensions();
  // 1.4.0 block K, layout only (logic, price and texts unchanged): inside the safe
  // area, 92% wide in portrait, the purchase button always visible at the bottom
  // (outside the scroll), "✕ Close" written like every other window.
  const { height: winH, isPortrait, isLandscape } = useOrientation();
  const insets = useSafeAreaInsets();
  const maxHeight = winH - insets.top - insets.bottom - 24;
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [success, setSuccess] = useState(false);

  const handlePurchase = async () => {
    setPurchasing(true);
    try {
      const ok = await onPurchase();
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      }
    } catch {
      Alert.alert(String(t('error')), String(t('purchaseFailed')));
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const ok = await onRestore();
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1500);
      } else {
        Alert.alert('', String(t('restoreFailed')));
      }
    } catch {
      Alert.alert('', String(t('restoreFailed')));
    } finally {
      setRestoring(false);
    }
  };

  const features = [
    { key: 'paywallFeature1', icon: 'infinite' as const },
    { key: 'paywallFeature2', icon: 'gift' as const },
    { key: 'paywallFeature3', icon: 'close-circle' as const },
    { key: 'paywallFeature4', icon: 'heart' as const },
  ];

  return (
    <Modal supportedOrientations={ALL_ORIENTATIONS} visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View testID="paywall" style={[styles.card, isPortrait && styles.cardPortrait, isLandscape && styles.cardLandscape, { maxHeight }]}>
          {/* Close button */}
          <View style={styles.header}>
            <TouchableOpacity testID="paywall-close" onPress={onClose} style={styles.closeBtn}
              accessibilityRole="button" accessibilityLabel={t('close') as string}>
              <Ionicons name="close" size={18} color="#D1D5DB" />
              <Text style={styles.closeBtnText} numberOfLines={1}>{t('close')}</Text>
            </TouchableOpacity>
          </View>

          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
              <Text style={styles.successText}>{t('paywallSuccess')}</Text>
            </View>
          ) : (
            <>
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.content, isLandscape && styles.contentLandscape]}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Globe icon */}
              <Ionicons name="globe-outline" size={isLandscape ? 32 : screenW < 600 ? 44 : 48} color="#00d4ff" style={[styles.globeIcon, isLandscape && styles.globeIconLandscape]} />

              {/* Title */}
              <Text style={styles.title}>{t('paywallTitle')}</Text>

              {/* Subtitle */}
              <Text style={styles.subtitle}>
                {String(t('paywallSubtitle')).replace('{0}', String(freeLimit))}
              </Text>

              {/* Features */}
              <View style={styles.featureList}>
                {features.map((f) => (
                  <View key={f.key} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={styles.featureText}>{t(f.key as TranslationKey)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Purchase and restore, fixed at the bottom; side by side in landscape */}
            <View style={[styles.footer, isLandscape && styles.footerLandscape]}>
              {/* Purchase button */}
              <TouchableOpacity
                testID="paywall-purchase"
                style={[styles.purchaseButton, isLandscape && styles.purchaseButtonLandscape]}
                onPress={handlePurchase}
                disabled={purchasing || restoring}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <View style={styles.purchaseButtonInner}>
                    <Ionicons name="lock-open" size={20} color="#fff" />
                    <Text style={styles.purchaseButtonText}>
                      {String(t('paywallButton')).replace('{0}', price)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Restore */}
              <TouchableOpacity testID="paywall-restore" onPress={handleRestore} disabled={purchasing || restoring} style={[styles.restoreBtn, isLandscape && styles.restoreBtnLandscape]}>
                {restoring ? (
                  <ActivityIndicator color="#60A5FA" size="small" />
                ) : (
                  <Text style={styles.restoreText}>{t('paywallRestore')}</Text>
                )}
              </TouchableOpacity>
            </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: MODAL_BACKDROP,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.15)',
    maxWidth: 550,
    width: '90%',
    backgroundColor: 'rgba(5,5,16,0.98)',
  },
  cardPortrait: { width: '92%' },
  // landscape: wider, so the purchase button keeps whole words at 130%
  cardLandscape: { maxWidth: 680 },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 14,
    paddingHorizontal: 14,
  },
  closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)' },
  closeBtnText: { color: '#D1D5DB', fontSize: 14, fontWeight: '600' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 4,
    paddingBottom: 8,
  },
  contentLandscape: { paddingTop: 0 },
  globeIcon: {
    marginBottom: 16,
  },
  globeIconLandscape: { marginBottom: 6 },
  footer: {
    paddingHorizontal: 32,
    paddingTop: 12,
    paddingBottom: 16,
    alignItems: 'center',
  },
  footerLandscape: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F0F0F0',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 20,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureText: {
    fontSize: 15,
    color: '#F0F0F0',
  },
  purchaseButton: {
    backgroundColor: '#00d4ff',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  purchaseButtonLandscape: { flex: 1.7, alignSelf: 'auto', paddingVertical: 12, paddingHorizontal: 16, minHeight: 48 },
  purchaseButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseButtonText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  restoreBtn: {
    marginTop: 8,
    padding: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreBtnLandscape: { marginTop: 0, flex: 1 },
  restoreText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#60A5FA',
  },
  successContainer: {
    paddingTop: 24,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  successText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
    textAlign: 'center',
  },
});

export default PaywallScreen;
