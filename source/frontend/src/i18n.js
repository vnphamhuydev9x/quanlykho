import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationVi from './locales/vi/translation.json';
import translationZh from './locales/zh/translation.json';

const resources = {
    vi: {
        translation: translationVi,
    },
    zh: {
        translation: translationZh,
    },
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'vi',
        debug: false,
        interpolation: {
            escapeValue: false, // React already safe from XSS
        },
        detection: {
            order: ['localStorage', 'navigator'],
            caches: ['localStorage'],
            lookupLocalStorage: 'app_language',
        }
    });

export default i18n;
