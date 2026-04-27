import type { SelectedSection } from "@/stores/app-store";

const LS_KEY = "cabinet.last-route";

function encodePathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function buildRouteHash(
  section: SelectedSection,
  pagePath: string | null
): string {
  if (section.type === "page" && section.mode === "cabinet" && section.cabinetPath && pagePath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/data/${encodePathSegment(pagePath)}`;
  }
  if (section.type === "page" && pagePath) {
    return `#/page/${encodePathSegment(pagePath)}`;
  }
  if (section.type === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}`;
  }
  if (section.type === "agent" && section.mode === "cabinet" && section.cabinetPath && section.slug) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/agents/${encodePathSegment(section.slug)}`;
  }
  if (section.type === "agents" && section.mode === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/agents`;
  }
  if (section.type === "tasks" && section.mode === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/tasks`;
  }
  if (section.type === "jobs" && section.mode === "cabinet" && section.cabinetPath) {
    return `#/cabinet/${encodePathSegment(section.cabinetPath)}/jobs`;
  }
  if (section.type === "agent" && section.slug) {
    return `#/ops/agents/${encodePathSegment(section.slug)}`;
  }
  if (section.type === "agents") {
    return "#/ops/agents";
  }
  if (section.type === "tasks") {
    return "#/ops/tasks";
  }
  if (section.type === "settings") {
    return section.slug
      ? `#/settings/${encodePathSegment(section.slug)}`
      : "#/settings";
  }
  if (section.type === "home") return "#/home";
  return "#/home";
}

function saveRouteHash(hash: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, hash);
  } catch {
    // ignore storage failures
  }
}

export function replaceRouteHash(
  section: SelectedSection,
  pagePath: string | null
): void {
  if (typeof window === "undefined") return;
  const hash = buildRouteHash(section, pagePath);
  if (window.location.hash !== hash) {
    window.history.replaceState(null, "", hash);
  }
  saveRouteHash(hash);
}

export function pushRouteHash(
  section: SelectedSection,
  pagePath: string | null
): void {
  if (typeof window === "undefined") return;
  const hash = buildRouteHash(section, pagePath);
  if (window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }
  saveRouteHash(hash);
}
