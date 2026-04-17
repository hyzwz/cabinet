/**
 * i18n Message Catalog
 *
 * Messages are split into domain files under ./messages/ for maintainability.
 * This file re-exports the merged catalog and provides the public API.
 *
 * To add new translations:
 *   1. Find the matching domain file in src/lib/i18n/messages/
 *   2. Add the key to both the En and Zh objects in that file
 *   3. If no domain matches, create a new domain file and import it in messages/index.ts
 */

import { allEnMessages, allZhMessages } from "./messages/index";

export { allEnMessages, allZhMessages };

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

export type MessageKey = keyof typeof allEnMessages;

export const messages: Record<Locale, Partial<Record<MessageKey, string>>> = {
  en: {
    ...allEnMessages,
  },
  zh: {
    ...allZhMessages,
  },
};

export function getMessage(key: MessageKey, locale: Locale): string {
  return messages[locale][key] || messages[FALLBACK_LOCALE][key] || key;
}

export function formatMessage(
  key: MessageKey,
  locale: Locale,
  values: Record<string, string | number>
): string {
  return getMessage(key, locale).replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = values[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}
