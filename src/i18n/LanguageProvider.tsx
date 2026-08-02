import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n, { STORAGE_KEY, dirFor } from "./index";

export function useLanguage() {
  const { i18n: instance } = useTranslation();
  const lang = instance.language || "fr";
  const setLanguage = (code: string) => {
    void instance.changeLanguage(code);
    try {
      window.localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
  };
  return { lang, dir: dirFor(lang), setLanguage };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n: instance } = useTranslation();

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (stored && stored !== instance.language) {
      void instance.changeLanguage(stored);
    }
  }, [instance]);

  useEffect(() => {
    const apply = (lng: string) => {
      const dir = dirFor(lng);
      document.documentElement.setAttribute("lang", lng);
      document.documentElement.setAttribute("dir", dir);
    };
    apply(i18n.language || "fr");
    i18n.on("languageChanged", apply);
    return () => {
      i18n.off("languageChanged", apply);
    };
  }, []);

  return <>{children}</>;
}
