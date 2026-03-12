import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getTranslations, type Language, type Translations } from '@shared/i18n';

const api = window.streampad;

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: getTranslations('en'),
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    api.settings.get().then((s: any) => {
      if (s?.language && (s.language === 'en' || s.language === 'de')) {
        setLanguageState(s.language);
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    api.settings.get().then((s: any) => {
      api.settings.set({ ...s, language: lang });
    });
  }, []);

  const t = getTranslations(language);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
