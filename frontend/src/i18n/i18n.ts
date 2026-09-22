const t = (k: string, f?: string) => f || k;
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationVI from './locales/vi.json';
import translationEN from './locales/en.json';

const resources = {
  vi: {
    translation: translationVI,
  },
  en: {
    translation: translationEN,
  },
};

i18n
  .use(LanguageDetector) // detect user language
  .use(initReactI18next) // pass the i18n instance to react-i18next.
  .init({
    resources,
    fallbackLng: 'vi', // default language
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
  });

export default i18n;
