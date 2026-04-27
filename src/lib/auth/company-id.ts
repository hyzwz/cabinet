export function normalizeCompanyIdFromName(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.toLowerCase().replace(/\s+/g, "-");
}

export function resolveConfiguredCompanyId(input: {
  company?: { id?: unknown; name?: unknown };
  companyId?: unknown;
}): string | null {
  const directCandidates = [input.company?.id, input.companyId];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (trimmed) {
        return trimmed;
      }
    }
  }

  return typeof input.company?.name === "string"
    ? normalizeCompanyIdFromName(input.company.name)
    : null;
}
