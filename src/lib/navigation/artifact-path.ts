import type { SelectedSection } from "@/stores/app-store";

function trimArtifactPath(value: string): string {
  return value.trim().replace(/^\.?\//, "").replace(/^\/+/, "").replace(/\/+$/, "");
}

export function normalizeArtifactRecordPath(path: string): string {
  const normalized = trimArtifactPath(path);
  if (!normalized) return "";
  if (normalized.endsWith("/index.md")) {
    return normalized.slice(0, -"/index.md".length);
  }
  if (normalized.endsWith(".md")) {
    return normalized.slice(0, -".md".length);
  }
  return normalized;
}

export function resolveArtifactTargetPath(
  artifactPath: string,
  section: SelectedSection
): string {
  const normalized = normalizeArtifactRecordPath(artifactPath);
  if (!normalized) return normalized;

  if (section.mode === "cabinet" && section.cabinetPath) {
    if (
      normalized === section.cabinetPath ||
      normalized.startsWith(`${section.cabinetPath}/`)
    ) {
      return normalized;
    }
    return `${section.cabinetPath}/${normalized}`;
  }

  return normalized;
}

export function getArtifactLabel(artifactPath: string): string {
  const normalized = normalizeArtifactRecordPath(artifactPath);
  const parts = normalized.split("/").filter(Boolean);
  return parts.at(-1) || normalized;
}
