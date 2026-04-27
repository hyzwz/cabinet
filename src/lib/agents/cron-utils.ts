/**
 * Human-readable cron expression formatting.
 * Shared between schedule-picker, agent-detail-panel, and agent-card.
 */

import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  type Locale,
} from "@/lib/i18n/messages";

const KNOWN_PRESETS: Record<Locale, Record<string, string>> = {
  en: {
    "*/5 * * * *": "Every 5 minutes",
    "*/15 * * * *": "Every 15 minutes",
    "*/30 * * * *": "Every 30 minutes",
    "0 * * * *": "Every hour",
    "0 */4 * * *": "Every 4 hours",
    "0 9 * * *": "Daily at 9:00 AM",
    "0 9 * * 1-5": "Weekdays at 9:00 AM",
    "0 9 * * 1": "Weekly on Monday",
    "0 9 1 * *": "Monthly on the 1st",
  },
  zh: {
    "*/5 * * * *": "每 5 分钟",
    "*/15 * * * *": "每 15 分钟",
    "*/30 * * * *": "每 30 分钟",
    "0 * * * *": "每小时",
    "0 */4 * * *": "每 4 小时",
    "0 9 * * *": "每天上午 9:00",
    "0 9 * * 1-5": "工作日上午 9:00",
    "0 9 * * 1": "每周一上午 9:00",
    "0 9 1 * *": "每月 1 日上午 9:00",
  },
};

function resolveLocale(locale?: Locale): Locale {
  if (locale) return normalizeLocale(locale);

  if (typeof window !== "undefined") {
    try {
      return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY));
    } catch {
      return DEFAULT_LOCALE;
    }
  }

  if (typeof document !== "undefined") {
    return normalizeLocale(document.documentElement.lang);
  }

  return DEFAULT_LOCALE;
}

function formatHour(hour: number, locale: Locale): string {
  if (locale === "zh") {
    const period = hour >= 12 ? "下午" : "上午";
    const h12 = hour > 12 ? hour - 12 : hour || 12;
    return `${period} ${h12}:00`;
  }

  const period = hour >= 12 ? "PM" : "AM";
  const h12 = hour > 12 ? hour - 12 : hour || 12;
  return `${h12}:00 ${period}`;
}

export function cronToHuman(cron: string, locale?: Locale): string {
  const resolvedLocale = resolveLocale(locale);
  if (KNOWN_PRESETS[resolvedLocale][cron]) return KNOWN_PRESETS[resolvedLocale][cron];

  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [min, hour, , , dow] = parts;

  if (min.startsWith("*/") && hour === "*") {
    const n = min.slice(2);
    if (resolvedLocale === "zh") {
      const daySuffix = dow === "1-5" ? "（工作日）" : dow === "0,6" ? "（周末）" : "";
      return `每 ${n} 分钟${daySuffix}`;
    }
    const dayStr = dow === "1-5" ? " on weekdays" : dow === "0,6" ? " on weekends" : "";
    return `Every ${n} min${dayStr}`;
  }

  if (min === "0" && hour.startsWith("*/")) {
    const n = hour.slice(2);
    if (resolvedLocale === "zh") {
      const daySuffix = dow === "1-5" ? "（工作日）" : "";
      return `每 ${n} 小时${daySuffix}`;
    }
    const dayStr = dow === "1-5" ? " on weekdays" : "";
    return `Every ${n}h${dayStr}`;
  }

  if (min === "0" && !hour.includes("*") && !hour.includes("/")) {
    const hourNum = parseInt(hour);
    const time = formatHour(hourNum, resolvedLocale);

    if (resolvedLocale === "zh") {
      const dayStr =
        dow === "1-5" ? "工作日" : dow === "*" ? "每天" : dow === "1" ? "周一" : `(${dow})`;
      return `${dayStr}${time}`;
    }

    const dayStr =
      dow === "1-5" ? "Weekdays" : dow === "*" ? "Daily" : dow === "1" ? "Mondays" : `(${dow})`;
    return `${dayStr} at ${time}`;
  }

  return cron;
}

/** Short label for use in agent cards (e.g., "15m", "4h", "Daily 9am") */
export function cronToShortLabel(cron: string, locale?: Locale): string {
  const resolvedLocale = resolveLocale(locale);
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;

  const [min, hour] = parts;

  if (min.startsWith("*/") && hour === "*") return `${min.slice(2)}m`;
  if (min === "0" && hour.startsWith("*/")) return `${hour.slice(2)}h`;
  if (min === "0" && hour === "*") return "1h";
  if (min === "0" && !hour.includes("*")) {
    const h = parseInt(hour);
    if (resolvedLocale === "zh") {
      return `${h}点`;
    }
    const ampm = h >= 12 ? "pm" : "am";
    const h12 = h > 12 ? h - 12 : h || 12;
    return `${h12}${ampm}`;
  }

  return cron;
}
