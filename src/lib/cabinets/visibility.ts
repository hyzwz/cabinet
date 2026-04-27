import { getMessage, type Locale, type MessageKey } from "@/lib/i18n/messages";
import type { CabinetVisibilityMode } from "@/types/cabinets";

export const CABINET_VISIBILITY_OPTIONS: Array<{
  value: CabinetVisibilityMode;
  labelKey: MessageKey;
  shortLabelKey: MessageKey;
}> = [
  {
    value: "own",
    labelKey: "cabinets.visibility.own.label",
    shortLabelKey: "cabinets.visibility.own.short",
  },
  {
    value: "children-1",
    labelKey: "cabinets.visibility.children1.label",
    shortLabelKey: "cabinets.visibility.children1.short",
  },
  {
    value: "children-2",
    labelKey: "cabinets.visibility.children2.label",
    shortLabelKey: "cabinets.visibility.children2.short",
  },
  {
    value: "all",
    labelKey: "cabinets.visibility.all.label",
    shortLabelKey: "cabinets.visibility.all.short",
  },
];

export function getCabinetVisibilityOptions(locale: Locale): Array<{
  value: CabinetVisibilityMode;
  label: string;
  shortLabel: string;
}> {
  return CABINET_VISIBILITY_OPTIONS.map((option) => ({
    value: option.value,
    label: getMessage(option.labelKey, locale),
    shortLabel: getMessage(option.shortLabelKey, locale),
  }));
}

export function parseCabinetVisibilityMode(
  value: string | null | undefined
): CabinetVisibilityMode {
  switch (value) {
    case "children-1":
    case "children-2":
    case "all":
      return value;
    default:
      return "own";
  }
}

export function cabinetVisibilityModeToDepth(
  mode: CabinetVisibilityMode
): number | null {
  switch (mode) {
    case "children-1":
      return 1;
    case "children-2":
      return 2;
    case "all":
      return null;
    default:
      return 0;
  }
}

export function cabinetVisibilityModeLabel(
  mode: CabinetVisibilityMode,
  locale: Locale
): string {
  return (
    getCabinetVisibilityOptions(locale).find((option) => option.value === mode)?.label ||
    getMessage("cabinets.visibility.own.label", locale)
  );
}
