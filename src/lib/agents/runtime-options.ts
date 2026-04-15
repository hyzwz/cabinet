import type {
  ProviderEffortLevel,
  ProviderInfo,
  ProviderModel,
} from "@/types/agents";

function matchesId<T extends { id: string }>(
  values: T[] | undefined,
  id?: string | null
): T | undefined {
  if (!id) return undefined;
  return values?.find((value) => value.id === id);
}

export function resolveProviderModel(
  provider: ProviderInfo | undefined,
  requestedModel?: string | null,
  fallbackModel?: string | null
): ProviderModel | undefined {
  const models = provider?.models || [];
  if (models.length === 0) return undefined;

  return (
    matchesId(models, requestedModel) ||
    matchesId(models, fallbackModel) ||
    models[0]
  );
}

export function getModelEffortLevels(
  provider: ProviderInfo | undefined,
  modelId?: string | null
): ProviderEffortLevel[] {
  if (!provider) return [];

  const model = matchesId(provider.models, modelId);
  if (model && "effortLevels" in model) {
    return model.effortLevels || [];
  }

  return provider.effortLevels || [];
}

export function resolveProviderEffort(
  provider: ProviderInfo | undefined,
  modelId?: string | null,
  requestedEffort?: string | null,
  fallbackEffort?: string | null
): ProviderEffortLevel | undefined {
  const effortLevels = getModelEffortLevels(provider, modelId);
  if (effortLevels.length === 0) return undefined;

  return (
    matchesId(effortLevels, requestedEffort) ||
    matchesId(effortLevels, fallbackEffort) ||
    undefined
  );
}

export function getSuggestedProviderEffort(
  provider: ProviderInfo | undefined,
  modelId?: string | null
): ProviderEffortLevel | undefined {
  const effortLevels = getModelEffortLevels(provider, modelId);
  if (effortLevels.length === 0) return undefined;

  return (
    matchesId(effortLevels, "medium") ||
    matchesId(effortLevels, "high") ||
    matchesId(effortLevels, "low") ||
    matchesId(effortLevels, "minimal") ||
    effortLevels[Math.floor((effortLevels.length - 1) / 2)] ||
    effortLevels[0]
  );
}

export function formatEffortName(value?: string | null): string | null {
  if (!value) return null;

  switch (value.trim().toLowerCase()) {
    case "xhigh":
      return "Extra High";
    case "max":
      return "Max";
    case "none":
      return "None";
    default:
      return value
        .trim()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(" ");
  }
}
