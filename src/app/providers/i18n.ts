import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ru from '@/shared/i18n/ru.json';
import en from '@/shared/i18n/en.json';
import kz from '@/shared/i18n/kz.json';

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
    kz: { translation: kz },
  },
  lng: localStorage.getItem('language') ?? 'ru',
  fallbackLng: 'ru',
  interpolation: { escapeValue: false },
});

export default i18n;
