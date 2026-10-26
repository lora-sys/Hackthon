"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Language = "zh" | "en";
const LanguageContext = createContext({
  language: "zh" as Language,
  t: (zh: string, en: string) => zh || en
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("zh");
  useEffect(() => {
    try {
      if (localStorage.getItem("wishlive:language") === "en") setLanguage("en");
    } catch { /* Storage is optional. */ }
  }, []);
  useEffect(() => { document.documentElement.lang = language === "zh" ? "zh-CN" : "en"; }, [language]);
  function toggle() {
    const next = language === "zh" ? "en" : "zh";
    setLanguage(next);
    try { localStorage.setItem("wishlive:language", next); } catch { /* Storage is optional. */ }
  }
  return (
    <LanguageContext.Provider value={{ language, t: (zh, en) => language === "zh" ? zh : en }}>
      <div className="flex items-center justify-end gap-3 border-b border-white/10 bg-[#090912] px-6 py-3 text-sm text-white">
        <span>{language === "zh" ? "语言" : "Language"}</span>
        <button type="button" onClick={toggle} aria-label={language === "zh" ? "Switch to English" : "切换为中文"}
          className="rounded-full border border-[#d9a5ff]/60 px-4 py-2 text-[#d9a5ff] focus-visible:outline focus-visible:outline-2">
          {language === "zh" ? "中文 / EN" : "EN / 中文"}
        </button>
      </div>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
