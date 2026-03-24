import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator,
  useWindowDimensions, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';

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
  const { height: screenH, width: screenW } = useWindowDimensions();
  const cardHeight = Math.min(screenH * 0.85, screenW < screenH ? screenH * 0.8 : screenH * 0.9);
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
      Alert.alert('Error', String(t('restoreFailed')));
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
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent hardwareAccelerated onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { height: cardHeight }]}>
          {/* Close button */}
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#9CA3AF" />
          </TouchableOpacity>

          {success ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={80} color="#10B981" />
              <Text style={styles.successText}>{t('paywallSuccess')}</Text>
            </View>
          ) : (
            <View style={styles.content}>
              {/* Globe icon */}
              <Ionicons name="globe-outline" size={64} color="#00d4ff" style={styles.globeIcon} />

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
                    <Text style={styles.featureText}>{t(f.key as any)}</Text>
                  </View>
                ))}
              </View>

              {/* Purchase button */}
              <TouchableOpacity
                style={styles.purchaseButton}
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
              <TouchableOpacity onPress={handleRestore} disabled={purchasing || restoring} style={styles.restoreBtn}>
                {restoring ? (
                  <ActivityIndicator color="#60A5FA" size="small" />
                ) : (
                  <Text style={styles.restoreText}>{t('paywallRestore')}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 24,
  },
  globeIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F0F0F0',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  featureList: {
    alignSelf: 'stretch',
    marginBottom: 28,
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
  purchaseButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  purchaseButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  restoreBtn: {
    marginTop: 16,
    padding: 8,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restoreText: {
    fontSize: 14,
    color: '#60A5FA',
  },
  successContainer: {
    flex: 1,
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
