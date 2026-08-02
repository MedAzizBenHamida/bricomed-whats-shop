import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import frCommon from "./locales/fr/common.json";
import frSite from "./locales/fr/site.json";
import frAdmin from "./locales/fr/admin.json";
import arCommon from "./locales/ar/common.json";
import arSite from "./locales/ar/site.json";
import arAdmin from "./locales/ar/admin.json";

export const LANGUAGES = [
  { code: "fr", label: "FR", name: "Français", dir: "ltr" as const },
  { code: "ar", label: "العربية", name: "العربية", dir: "rtl" as const },
];

export const STORAGE_KEY = "bricomed-lang";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      fr: { common: frCommon, site: frSite, admin: frAdmin },
      ar: { common: arCommon, site: arSite, admin: arAdmin },
    },
    lng: "fr",
    fallbackLng: "fr",
    defaultNS: "common",
    ns: ["common", "site", "admin"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export function dirFor(lang: string) {
  return lang === "ar" ? "rtl" : "ltr";
}

export default i18n;
