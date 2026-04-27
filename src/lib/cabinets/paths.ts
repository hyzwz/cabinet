export const ROOT_CABINET_PATH = ".";

export function normalizeCabinetPath(
  value?: string | null,
  fallbackToRoot = false
): string | undefined {
  if (typeof value !== "string") {
    return fallbackToRoot ? ROOT_CABINET_PATH : undefined;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === "/" || trimmed === "./") {
    return fallbackToRoot ? ROOT_CABINET_PATH : undefined;
  }

  if (trimmed === ROOT_CABINET_PATH) {
    return ROOT_CABINET_PATH;
  }

  const normalized = trimmed
    .replace(/^\.\//, "")
    .replace(/^\/+/, "")
    .replace(/\/+$/, "");

  if (
    normalized.length === 0 ||
    pathHasTraversal(normalized)
  ) {
    return fallbackToRoot ? ROOT_CABINET_PATH : undefined;
  }

  return normalized;
}

function pathHasTraversal(value: string): boolean {
  return value
    .split("/")
    .some((segment) => segment === ".." || segment === "." || segment.length === 0);
}

export function isRootCabinetPath(value?: string | null): boolean {
  return normalizeCabinetPath(value, true) === ROOT_CABINET_PATH;
}

export function buildCabinetScopedId(
  cabinetPath: string | undefined,
  entity: "agent" | "job",
  id: string
): string {
  const normalized = normalizeCabinetPath(cabinetPath, true) || ROOT_CABINET_PATH;
  return `${normalized}::${entity}::${id}`;
}
