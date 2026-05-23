import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

type TranslateFn = (key: string) => string | string[];

const BACKGROUND_GRACE_MS = 5 * 60 * 1000;

export function useAuth(biometricEnabled: boolean, isSettingsLoaded: boolean, t: TranslateFn) {
  const [authenticated, setAuthenticated] = useState(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef<number>(0);

  // Biometric auth on startup
  useEffect(() => {
    if (!isSettingsLoaded) return;
    if (!biometricEnabled) {
      setAuthenticated(true);
      return;
    }
    (async () => {
      try {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          console.warn('[TravelSphere] Biometric hardware unavailable or not enrolled, skipping auth');
          setAuthenticated(true);
          return;
        }
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('biometricPrompt') as string,
        });
        setAuthenticated(result.success);
      } catch {
        setAuthenticated(false);
      }
    })();
  }, [isSettingsLoaded, biometricEnabled, t]);

  // Grace period: brief backgrounds (photo/camera picker) must not re-auth — re-auth unmounts any open form and wipes its state.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current === 'active' && nextState.match(/inactive|background/)) {
        backgroundedAtRef.current = Date.now();
      }
      if (
        appStateRef.current.match(/background/) &&
        nextState === 'active' &&
        biometricEnabled
      ) {
        const elapsed = Date.now() - backgroundedAtRef.current;
        if (elapsed >= BACKGROUND_GRACE_MS) {
          setAuthenticated(false);
          (async () => {
            try {
              const result = await LocalAuthentication.authenticateAsync({
                promptMessage: t('biometricPrompt') as string,
              });
              setAuthenticated(result.success);
            } catch {
              setAuthenticated(false);
            }
          })();
        }
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [biometricEnabled, t]);

  return { authenticated };
}
