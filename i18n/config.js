import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './fr.json';
import mg from './mg.json';
import en from './en.json'

i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    lng: 'fr', // Langue par défaut
    fallbackLng: 'fr',
    resources: {
        fr: { translation: fr },
        mg: { translation: mg },
        en: { translation: en }
    },
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;