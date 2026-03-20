import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

type TranslateFn = (key: string) => string | string[];

export function useAuth(biometricEnabled: boolean, isSettingsLoaded: boolean, t: TranslateFn) {
  const [authenticated, setAuthenticated] = useState(false);
  const appStateRef = useRef(AppState.currentState);

  // Biometric auth on startup
  useEffect(() => {
    if (!isSettingsLoaded) return;
    if (!biometricEnabled) {
      setAuthenticated(true);
      return;
    }
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
  }, [isSettingsLoaded, biometricEnabled, t]);

  // Biometric re-auth when app returns from background
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/background/) &&
        nextState === 'active' &&
        biometricEnabled
      ) {
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
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [biometricEnabled, t]);

  return { authenticated };
}
