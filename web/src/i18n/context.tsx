import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { Locale, Translations } from './types';
import { en } from './locales/en';
import { ptBR } from './locales/pt-BR';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
  formatDate: (dateString: string) => string;
}

const STORAGE_KEY = 'edgekit_locale';

const translationsMap: Record<Locale, Translations> = {
  en,
  'pt-BR': ptBR,
};

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved && (saved === 'en' || saved === 'pt-BR')) {
      return saved;
    }

    if (navigator.language && navigator.language.toLowerCase().startsWith('pt')) {
      return 'pt-BR';
    }
  }
  return 'en';
}

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, newLocale);
      document.documentElement.lang = newLocale;
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useMemo(() => translationsMap[locale] || en, [locale]);

  const formatDate = useCallback(
    (dateString: string): string => {
      try {
        const date = new Date(dateString);
        const intlLocale = locale === 'pt-BR' ? 'pt-BR' : 'en-US';
        return new Intl.DateTimeFormat(intlLocale, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }).format(date);
      } catch {
        return dateString;
      }
    },
    [locale]
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      formatDate,
    }),
    [locale, setLocale, t, formatDate]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
