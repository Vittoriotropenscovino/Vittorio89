import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  showHomeLines?: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  language: 'it',
  biometricEnabled: false,
  hasSeenOnboarding: false,
  hasAcceptedGDPR: false,
};

interface AppContextType {
  settings: AppSettings;
  t: (key: TranslationKey) => any;
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
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
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

  const t = useCallback((key: TranslationKey) => {
    return translations[settings.language][key] ?? key;
  }, [settings.language]);

  return (
    <AppContext.Provider value={{
      settings,
      t,
      language: settings.language,
      setLanguage,
      updateSettings,
      isSettingsLoaded,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export default AppContext;
