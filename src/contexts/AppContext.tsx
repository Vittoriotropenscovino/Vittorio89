import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, Language, TranslationKey } from '../i18n/translations';
import { HomeLocation } from '../types';

const SETTINGS_KEY = '@travelsphere_settings';

export interface AppSettings {
  language: Language;
  biometricEnabled: boolean;
  hasSeenOnboarding: boolean;
  hasAcceptedGDPR: boolean;
  homeLocation?: HomeLocation;
  showTravelLines?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'it',
  biometricEnabled: false,
  hasSeenOnboarding: false,
  hasAcceptedGDPR: false,
};

interface AppContextType {
  settings: AppSettings;
  t: (key: string) => string | string[];
  language: Language;
  setLanguage: (lang: Language) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  isSettingsLoaded: boolean;
}

const AppContext = createContext<AppContextType>({
  settings: DEFAULT_SETTINGS,
  t: (key) => key,
  language: 'it',
  setLanguage: () => {},
  updateSettings: () => {},
  isSettingsLoaded: false,
});

export const useApp = () => useContext(AppContext);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(SETTINGS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.showHomeLines !== undefined && parsed.showTravelLines === undefined) {
            parsed.showTravelLines = parsed.showHomeLines;
            delete parsed.showHomeLines;
          }
          setSettings({ ...DEFAULT_SETTINGS, ...parsed });
        }
      } catch (e) {
        console.error('Error loading settings:', e);
      } finally {
        setIsSettingsLoaded(true);
      }
    })();
  }, []);

  const persistSettings = useCallback(async (newSettings: AppSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.error('Error saving settings:', e);
    }
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...partial };
      persistSettings(updated);
      return updated;
    });
  }, [persistSettings]);

  const setLanguage = useCallback((lang: Language) => {
    updateSettings({ language: lang });
  }, [updateSettings]);

  const t = useCallback((key: string): string | string[] => {
    const dict = translations[settings.language] as Record<string, string | string[]>;
    return dict[key] ?? key;
  }, [settings.language]);

  const contextValue = useMemo(() => ({
    settings,
    t,
    language: settings.language,
    setLanguage,
    updateSettings,
    isSettingsLoaded,
  }), [settings, t, setLanguage, updateSettings, isSettingsLoaded]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
