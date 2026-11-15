import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { ShareCardCaptureHandle } from '../components/ShareCardCapture';
import { requestReviewIfAppropriate } from '../utils/reviewPrompt';
import { useApp } from '../contexts/AppContext';

/**
 * "Share your globe": capture the ShareCard (pure RN, never the globe WebView)
 * and open the system share sheet. Used by Statistics and by the new entry
 * points on the main screen, so they all behave the same.
 *
 * The caller renders <ShareCardCapture ref={captureHostRef} … /> somewhere in
 * its tree and calls share(). After a successful share the review prompt runs,
 * exactly as before (reviewPrompt.ts decides if and when).
 */
export function useShareGlobe() {
  const { t } = useApp();
  const captureHostRef = useRef<ShareCardCaptureHandle>(null);
  const [sharing, setSharing] = useState(false);
  const sharingRef = useRef(false);

  const share = useCallback(async (beforeCapture?: () => void): Promise<boolean> => {
    if (sharingRef.current) return false;
    sharingRef.current = true;
    setSharing(true);
    try {
      beforeCapture?.();
      const uri = await captureHostRef.current?.capture();
      if (!uri) throw new Error('capture returned no uri');
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('shareGlobe') as string,
          UTI: 'public.png',
        });
        // Happy moment: the user just showed off their globe. The share sheet is
        // closed when shareAsync resolves, so the review dialog doesn't overlap it.
        requestReviewIfAppropriate().catch(() => {});
        return true;
      }
      Alert.alert(t('error') as string, t('shareFailed') as string);
      return false;
    } catch (e) {
      console.warn('[Share] globe share failed', e);
      Alert.alert(t('error') as string, t('shareFailed') as string);
      return false;
    } finally {
      sharingRef.current = false;
      setSharing(false);
    }
  }, [t]);

  return { captureHostRef, sharing, share };
}
