export const SUPPORTED_LOCALES = ["zh", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "zh";
export const FALLBACK_LOCALE: Locale = "en";
export const LOCALE_STORAGE_KEY = "cabinet.locale";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && SUPPORTED_LOCALES.includes(value as Locale);
}

export function normalizeLocale(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

const enMessages = {
  "locale.zh": "中文",
  "locale.en": "English",
  "locale.switcher.ariaLabel": "Select language",
  "header.productName": "Cabinet",
  "login.helper": "Enter password to continue",
  "login.passwordPlaceholder": "Password",
  "login.signIn": "Sign in",
  "login.wrongPassword": "Wrong password",
  "login.connectionError": "Connection error",
  "login.loading": "...",
} as const;

export type MessageKey = keyof typeof enMessages;

export const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en: {
    ...enMessages,
  },
  zh: {
    "locale.zh": "中文",
    "locale.en": "English",
    "locale.switcher.ariaLabel": "选择语言",
    "login.helper": "输入密码以继续",
    "login.passwordPlaceholder": "密码",
    "login.signIn": "登录",
    "login.wrongPassword": "密码错误",
    "login.connectionError": "连接错误",
    "login.loading": "...",
  },
};

export function getMessage(key: MessageKey, locale: Locale): string {
  return messages[locale][key] || messages[FALLBACK_LOCALE][key] || key;
}
