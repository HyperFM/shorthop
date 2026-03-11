const LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  zh: "中文",
  ar: "العربية",
  hi: "हिन्दी",
  pt: "Português",
  ja: "日本語",
  ko: "한국어",
  de: "Deutsch",
  sw: "Kiswahili",
  tl: "Tagalog",
  vi: "Tiếng Việt",
  ru: "Русский",
};

export function getLanguages() {
  return LANGUAGES;
}

export function getLanguageName(code: string): string {
  return LANGUAGES[code] || code;
}

export async function translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  if (fromLang === toLang || !text.trim()) return text;

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.substring(0, 500))}&langpair=${fromLang}|${toLang}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return text;
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      const translated = data.responseData.translatedText;
      if (translated.toUpperCase() === text.toUpperCase()) return text;
      return translated;
    }
    return text;
  } catch {
    return text;
  }
}
