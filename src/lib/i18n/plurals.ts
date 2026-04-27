import type { Locale } from "./messages";

export function getPluralSuffix(locale: Locale, count: number): string {
  return locale === "en" && count !== 1 ? "s" : "";
}
