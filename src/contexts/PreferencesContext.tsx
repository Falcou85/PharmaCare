import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { translations, type Language } from '../i18n/translations';

export type Theme = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';
export type Currency = 'USD' | 'EUR' | 'MAD' | 'CAD' | 'GBP';

export interface Preferences {
  theme: Theme;
  language: Language;
  currency: Currency;
  date_format: string;
  density: Density;
  notifications_enabled: boolean;
}

const DEFAULT_PREFERENCES: Preferences = {
  theme: 'light',
  language: 'en',
  currency: 'USD',
  date_format: 'MM/DD/YYYY',
  density: 'comfortable',
  notifications_enabled: true,
};

interface PreferencesContextType {
  preferences: Preferences;
  effectiveTheme: 'light' | 'dark';
  updatePreferences: (updates: Partial<Preferences>) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | Date) => string;
  formatDateTime: (date: string | Date) => string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme;
}

function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function loadLocalPrefs(): Partial<Preferences> {
  try {
    const raw = localStorage.getItem('pharmacare_preferences');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalPrefs(prefs: Preferences) {
  try {
    localStorage.setItem('pharmacare_preferences', JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(() => ({
    ...DEFAULT_PREFERENCES,
    ...loadLocalPrefs(),
  }));
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(getSystemTheme);

  const effectiveTheme = preferences.theme === 'system' ? systemTheme : preferences.theme;

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.lang = preferences.language;
  }, [effectiveTheme, preferences.language]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        const loaded: Preferences = {
          theme: (data.theme as Theme) || DEFAULT_PREFERENCES.theme,
          language: (data.language as Language) || DEFAULT_PREFERENCES.language,
          currency: (data.currency as Currency) || DEFAULT_PREFERENCES.currency,
          date_format: data.date_format || DEFAULT_PREFERENCES.date_format,
          density: (data.density as Density) || DEFAULT_PREFERENCES.density,
          notifications_enabled: data.notifications_enabled ?? true,
        };
        setPreferences(loaded);
        saveLocalPrefs(loaded);
      } else if (!data) {
        const localPrefs = { ...DEFAULT_PREFERENCES, ...loadLocalPrefs() };
        await supabase.from('user_preferences').insert([{ user_id: user.id, ...localPrefs }]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const updatePreferences = useCallback(async (updates: Partial<Preferences>) => {
    const newPrefs = { ...preferences, ...updates };
    setPreferences(newPrefs);
    saveLocalPrefs(newPrefs);

    if (user) {
      await supabase
        .from('user_preferences')
        .upsert([{ user_id: user.id, ...newPrefs, updated_at: new Date().toISOString() }]);
    }
  }, [preferences, user]);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    const value = getNestedValue(translations[preferences.language], key) ||
                  getNestedValue(translations.en, key) ||
                  key;

    if (typeof value !== 'string') return key;

    if (params) {
      return Object.entries(params).reduce(
        (acc, [k, v]) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v)),
        value
      );
    }
    return value;
  }, [preferences.language]);

  const currencyLocale = preferences.language === 'fr' ? 'fr-FR' : 'en-US';

  const formatCurrency = useCallback((amount: number) => {
    try {
      return new Intl.NumberFormat(currencyLocale, {
        style: 'currency',
        currency: preferences.currency,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${preferences.currency}`;
    }
  }, [preferences.currency, currencyLocale]);

  const formatDate = useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(currencyLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(d);
  }, [currencyLocale]);

  const formatDateTime = useCallback((date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(currencyLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  }, [currencyLocale]);

  return (
    <PreferencesContext.Provider
      value={{
        preferences,
        effectiveTheme,
        updatePreferences,
        t,
        formatCurrency,
        formatDate,
        formatDateTime,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}

export function useTranslation() {
  const { t } = usePreferences();
  return { t };
}
