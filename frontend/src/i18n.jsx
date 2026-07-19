import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import strings from './i18n/strings.json';

const STORAGE_KEY = 'roadpulse_lang';
const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved && strings[saved] ? saved : 'en';
  });

  const setLang = (next) => {
    if (!strings[next]) return;
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = useMemo(() => {
    const table = strings[lang] || strings.en;
    return (key) => table[key] || strings.en[key] || key;
  }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t, languages: ['en', 'hi', 'kn'] }),
    [lang, t]
  );

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useI18n must be used within LanguageProvider');
  return ctx;
}

export function langLabel(code) {
  return strings[code]?.langName || code;
}
