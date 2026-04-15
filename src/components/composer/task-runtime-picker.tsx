"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, BrainCircuit, Check, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  formatEffortName,
  getModelEffortLevels,
  getSuggestedProviderEffort,
  resolveProviderEffort,
  resolveProviderModel,
} from "@/lib/agents/runtime-options";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getDefaultAdapterTypeForProviderInfo } from "@/lib/agents/adapter-options";
import type { ConversationRuntimeOverride } from "@/types/conversations";
import type { ProviderEffortLevel, ProviderInfo } from "@/types/agents";

export type TaskRuntimeSelection = ConversationRuntimeOverride;

interface ProvidersResponse {
  providers?: ProviderInfo[];
  defaultProvider?: string | null;
  defaultModel?: string | null;
  defaultEffort?: string | null;
}

const DEFAULT_EFFORT_TONE = {
  chip:
    "border-border/70 bg-background/90 text-foreground shadow-[0_8px_20px_-16px_rgba(15,23,42,0.35)]",
  text: "text-foreground",
  thumb:
    "[&_[data-slot=slider-thumb]]:border-foreground/70 [&_[data-slot=slider-thumb]]:bg-background",
};

const EFFORT_TONES: Record<
  string,
  {
    chip: string;
    text: string;
    thumb: string;
  }
> = {
  none: {
    chip:
      "border-slate-300/70 bg-slate-100/90 text-slate-700 shadow-[0_10px_24px_-18px_rgba(51,65,85,0.7)] dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100",
    text: "text-slate-600 dark:text-slate-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-slate-500 [&_[data-slot=slider-thumb]]:bg-slate-100 dark:[&_[data-slot=slider-thumb]]:bg-slate-950",
  },
  minimal: {
    chip:
      "border-yellow-300/70 bg-yellow-100/90 text-yellow-900 shadow-[0_10px_24px_-18px_rgba(234,179,8,0.85)] dark:border-yellow-700 dark:bg-yellow-950/70 dark:text-yellow-100",
    text: "text-yellow-700 dark:text-yellow-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-yellow-500 [&_[data-slot=slider-thumb]]:bg-yellow-50 dark:[&_[data-slot=slider-thumb]]:bg-yellow-950",
  },
  low: {
    chip:
      "border-amber-300/70 bg-amber-100/90 text-amber-900 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.9)] dark:border-amber-700 dark:bg-amber-950/70 dark:text-amber-100",
    text: "text-amber-700 dark:text-amber-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-amber-500 [&_[data-slot=slider-thumb]]:bg-amber-50 dark:[&_[data-slot=slider-thumb]]:bg-amber-950",
  },
  medium: {
    chip:
      "border-orange-300/70 bg-orange-100/90 text-orange-900 shadow-[0_10px_24px_-18px_rgba(249,115,22,0.95)] dark:border-orange-700 dark:bg-orange-950/70 dark:text-orange-100",
    text: "text-orange-700 dark:text-orange-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-orange-500 [&_[data-slot=slider-thumb]]:bg-orange-50 dark:[&_[data-slot=slider-thumb]]:bg-orange-950",
  },
  high: {
    chip:
      "border-emerald-300/70 bg-emerald-100/90 text-emerald-900 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.95)] dark:border-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-100",
    text: "text-emerald-700 dark:text-emerald-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-emerald-500 [&_[data-slot=slider-thumb]]:bg-emerald-50 dark:[&_[data-slot=slider-thumb]]:bg-emerald-950",
  },
  xhigh: {
    chip:
      "border-rose-300/70 bg-rose-100/90 text-rose-900 shadow-[0_10px_24px_-18px_rgba(244,63,94,0.95)] dark:border-rose-700 dark:bg-rose-950/70 dark:text-rose-100",
    text: "text-rose-700 dark:text-rose-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-rose-500 [&_[data-slot=slider-thumb]]:bg-rose-50 dark:[&_[data-slot=slider-thumb]]:bg-rose-950",
  },
  max: {
    chip:
      "border-red-300/70 bg-red-100/90 text-red-900 shadow-[0_10px_24px_-18px_rgba(239,68,68,0.95)] dark:border-red-700 dark:bg-red-950/70 dark:text-red-100",
    text: "text-red-700 dark:text-red-300",
    thumb:
      "[&_[data-slot=slider-thumb]]:border-red-500 [&_[data-slot=slider-thumb]]:bg-red-50 dark:[&_[data-slot=slider-thumb]]:bg-red-950",
  },
};

function getEffortTone(effortId?: string): {
  chip: string;
  text: string;
  thumb: string;
} {
  if (!effortId) return DEFAULT_EFFORT_TONE;
  return EFFORT_TONES[effortId.toLowerCase()] || DEFAULT_EFFORT_TONE;
}

function getEffortTrackClass(
  effortLevels: ProviderEffortLevel[]
): string {
  const ids = new Set(effortLevels.map((effort) => effort.id.toLowerCase()));

  if (ids.has("none")) {
    return "[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(203,213,225,0.98)_0%,rgba(253,224,71,0.98)_32%,rgba(251,146,60,0.98)_64%,rgba(244,63,94,0.98)_100%)] dark:[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(51,65,85,0.98)_0%,rgba(202,138,4,0.98)_32%,rgba(234,88,12,0.98)_64%,rgba(190,24,93,0.98)_100%)]";
  }

  if (ids.has("xhigh") || ids.has("max")) {
    return "[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(253,224,71,0.98)_0%,rgba(251,146,60,0.98)_33%,rgba(52,211,153,0.98)_66%,rgba(244,63,94,0.98)_100%)] dark:[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(202,138,4,0.98)_0%,rgba(234,88,12,0.98)_33%,rgba(5,150,105,0.98)_66%,rgba(190,24,93,0.98)_100%)]";
  }

  if (ids.has("high")) {
    return "[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(253,224,71,0.98)_0%,rgba(251,146,60,0.98)_48%,rgba(16,185,129,0.98)_100%)] dark:[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(202,138,4,0.98)_0%,rgba(234,88,12,0.98)_48%,rgba(4,120,87,0.98)_100%)]";
  }

  return "[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(253,224,71,0.98)_0%,rgba(251,146,60,0.98)_100%)] dark:[&_[data-slot=slider-track]]:bg-[linear-gradient(90deg,rgba(202,138,4,0.98)_0%,rgba(234,88,12,0.98)_100%)]";
}

function isProviderReady(provider: ProviderInfo): boolean {
  return (
    (provider.enabled ?? true) &&
    provider.available &&
    (provider.authenticated ?? true)
  );
}

function getSelectableProviders(providers: ProviderInfo[]): ProviderInfo[] {
  const enabled = providers.filter((provider) => provider.enabled ?? true);
  const ready = enabled.filter(isProviderReady);
  if (ready.length > 0) return ready;
  if (enabled.length > 0) return enabled;
  return providers;
}

function resolveSelectedProvider(
  providers: ProviderInfo[],
  providerId?: string,
  fallbackProviderId?: string | null
): ProviderInfo | undefined {
  const selectable = getSelectableProviders(providers);
  return (
    selectable.find((provider) => provider.id === providerId) ||
    selectable.find((provider) => provider.id === fallbackProviderId) ||
    selectable[0] ||
    providers.find((provider) => provider.id === providerId) ||
    providers.find((provider) => provider.id === fallbackProviderId)
  );
}

function resolveSelectedModel(
  provider: ProviderInfo | undefined,
  requestedModel?: string,
  fallbackModel?: string | null
): ReturnType<typeof resolveProviderModel> {
  return resolveProviderModel(provider, requestedModel, fallbackModel);
}

function normalizeSelection(
  value: TaskRuntimeSelection,
  providers: ProviderInfo[],
  defaultProviderId?: string | null,
  defaultModel?: string | null,
  defaultEffort?: string | null
): TaskRuntimeSelection {
  const selectedProvider = resolveSelectedProvider(
    providers,
    value.providerId,
    defaultProviderId
  );
  const selectedModel = resolveSelectedModel(
    selectedProvider,
    value.model,
    selectedProvider?.id === defaultProviderId ? defaultModel : undefined
  );
  const selectedEffort = resolveProviderEffort(
    selectedProvider,
    selectedModel?.id,
    value.effort,
    selectedProvider?.id === defaultProviderId ? defaultEffort : undefined
  );

  return {
    providerId: selectedProvider?.id,
    adapterType: getDefaultAdapterTypeForProviderInfo(
      providers,
      selectedProvider?.id,
      defaultProviderId
    ),
    model: selectedModel?.id,
    effort: selectedEffort?.id,
  };
}

function sameSelection(
  left: TaskRuntimeSelection,
  right: TaskRuntimeSelection
): boolean {
  return (
    (left.providerId || "") === (right.providerId || "") &&
    (left.adapterType || "") === (right.adapterType || "") &&
    (left.model || "") === (right.model || "") &&
    (left.effort || "") === (right.effort || "")
  );
}

function ProviderGlyph({
  icon,
  className,
}: {
  icon?: string;
  className?: string;
}) {
  if (icon === "sparkles") {
    return <Sparkles className={className} />;
  }
  return <Bot className={className} />;
}

export function TaskRuntimePicker({
  value,
  onChange,
  align = "start",
  className,
}: {
  value: TaskRuntimeSelection;
  onChange: (value: TaskRuntimeSelection) => void;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProviderId, setDefaultProviderId] = useState<string | null>(null);
  const [defaultModel, setDefaultModel] = useState<string | null>(null);
  const [defaultEffort, setDefaultEffort] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/agents/providers");
        if (!response.ok) return;
        const data = (await response.json()) as ProvidersResponse;
        if (cancelled) return;
        setProviders((data.providers || []) as ProviderInfo[]);
        setDefaultProviderId(
          typeof data.defaultProvider === "string" ? data.defaultProvider : null
        );
        setDefaultModel(
          typeof data.defaultModel === "string" ? data.defaultModel : null
        );
        setDefaultEffort(
          typeof data.defaultEffort === "string" ? data.defaultEffort : null
        );
      } catch {
        if (!cancelled) {
          setProviders([]);
          setDefaultProviderId(null);
          setDefaultModel(null);
          setDefaultEffort(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const normalizedValue = useMemo(
    () =>
      providers.length > 0
        ? normalizeSelection(
            value,
            providers,
            defaultProviderId,
            defaultModel,
            defaultEffort
          )
        : value,
    [defaultEffort, defaultModel, defaultProviderId, providers, value]
  );

  useEffect(() => {
    if (providers.length === 0) return;
    if (!sameSelection(value, normalizedValue)) {
      onChange(normalizedValue);
    }
  }, [normalizedValue, onChange, providers.length, value]);

  const selectableProviders = useMemo(
    () => getSelectableProviders(providers),
    [providers]
  );
  const selectedProvider = useMemo(
    () =>
      resolveSelectedProvider(
        providers,
        normalizedValue.providerId,
        defaultProviderId
      ),
    [defaultProviderId, normalizedValue.providerId, providers]
  );
  const selectedModel = useMemo(
    () =>
      resolveSelectedModel(
        selectedProvider,
        normalizedValue.model,
        selectedProvider?.id === defaultProviderId ? defaultModel : undefined
      ),
    [defaultModel, defaultProviderId, normalizedValue.model, selectedProvider]
  );
  const selectedEffort = useMemo(
    () =>
      resolveProviderEffort(
        selectedProvider,
        selectedModel?.id,
        normalizedValue.effort,
        selectedProvider?.id === defaultProviderId ? defaultEffort : undefined
      ),
    [
      defaultEffort,
      defaultProviderId,
      normalizedValue.effort,
      selectedModel?.id,
      selectedProvider,
    ]
  );

  const selectedEffortLevels = useMemo(
    () => getModelEffortLevels(selectedProvider, selectedModel?.id),
    [selectedModel?.id, selectedProvider]
  );
  const displayEffort =
    selectedEffort ||
    getSuggestedProviderEffort(selectedProvider, selectedModel?.id);
  const displayEffortTone = getEffortTone(displayEffort?.id);

  function applySelection(providerId: string, modelId?: string) {
    onChange(
      normalizeSelection(
        {
          providerId,
          model: modelId,
          effort: normalizedValue.effort,
        },
        providers,
        defaultProviderId,
        defaultModel,
        defaultEffort
      )
    );
  }

  function applyEffort(effortId?: string) {
    onChange(
      normalizeSelection(
        {
          ...normalizedValue,
          effort: effortId,
        },
        providers,
        defaultProviderId,
        defaultModel,
        defaultEffort
      )
    );
  }

  function resetToDefault() {
    onChange(
      normalizeSelection(
        {
          providerId: defaultProviderId || undefined,
          model: defaultModel || undefined,
          effort: defaultEffort || undefined,
        },
        providers,
        defaultProviderId,
        defaultModel,
        defaultEffort
      )
    );
  }

  const selectionSummary = selectedProvider
    ? [
        selectedProvider.name,
        selectedModel?.name,
        selectedEffort?.name || formatEffortName(selectedEffort?.id),
      ]
        .filter(Boolean)
        .join(" · ")
    : loading
      ? "Loading providers..."
      : "No providers available";

  const triggerTitle = selectedProvider
    ? `Task model: ${selectionSummary}`
    : "Task model";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        aria-label={triggerTitle}
        title={triggerTitle}
        disabled={loading && providers.length === 0}
      >
        <BrainCircuit className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-72 min-w-[18rem]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Task Model</DropdownMenuLabel>
          <div className="px-1.5 pb-2">
            {selectedProvider ? (
              <div className="rounded-xl border border-border/70 bg-muted/20 p-2.5">
                <div className="flex items-start gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-muted-foreground">
                    <ProviderGlyph
                      icon={selectedProvider.icon}
                      className="h-4 w-4"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {selectedModel?.name || selectedProvider.name}
                      </p>
                      {displayEffort ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                            displayEffortTone.chip
                          )}
                        >
                          {displayEffort.name}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {[selectedProvider.name, selectedModel?.description]
                        .filter(Boolean)
                        .join(" · ") || "Provider and model selection"}
                    </p>
                  </div>
                </div>

                {selectedEffortLevels.length > 0 && displayEffort ? (
                  <div className="mt-3 rounded-lg border border-border/70 bg-background/80 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-foreground">
                          Reasoning effort
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {displayEffort.description ||
                            "Available levels for this model"}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          applyEffort(undefined);
                        }}
                      >
                        {selectedProvider.id === defaultProviderId && defaultEffort
                          ? "App default"
                          : "Model default"}
                      </button>
                    </div>

                    <div
                      className="mt-2"
                      onClick={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                    >
                      <Slider
                        value={[
                          Math.max(
                            selectedEffortLevels.findIndex(
                              (effort) => effort.id === displayEffort.id
                            ),
                            0
                          ),
                        ]}
                        min={0}
                        max={Math.max(selectedEffortLevels.length - 1, 0)}
                        step={1}
                        className={cn(
                          "[&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]",
                          getEffortTrackClass(selectedEffortLevels),
                          displayEffortTone.thumb
                        )}
                        onValueChange={(nextValue) => {
                          const rawValue = Array.isArray(nextValue)
                            ? nextValue[0] ?? 0
                            : nextValue;
                          const nextIndex = Math.max(
                            0,
                            Math.min(
                              selectedEffortLevels.length - 1,
                              Math.round(rawValue)
                            )
                          );
                          const nextEffort = selectedEffortLevels[nextIndex];
                          if (nextEffort) {
                            applyEffort(nextEffort.id);
                          }
                        }}
                      />

                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {selectedEffortLevels.map((effort) => {
                          const isActive = displayEffort.id === effort.id;
                          const effortTone = getEffortTone(effort.id);
                          return (
                            <button
                              key={effort.id}
                              type="button"
                              className={cn(
                                "rounded-full border px-2 py-1 text-[10px] font-medium transition-colors",
                                isActive
                                  ? effortTone.chip
                                  : "border-border/70 bg-background/90 text-muted-foreground hover:text-foreground"
                              )}
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                applyEffort(effort.id);
                              }}
                            >
                              {effort.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="text-[11px] text-muted-foreground">
                {selectionSummary}
              </div>
            )}
          </div>
        </DropdownMenuGroup>

        <DropdownMenuItem onClick={resetToDefault} disabled={providers.length === 0}>
          Use app default
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {selectableProviders.length > 0 ? (
          selectableProviders.map((provider) => {
            const providerSelection = normalizeSelection(
              { providerId: provider.id },
              providers,
              defaultProviderId,
              defaultModel,
              defaultEffort
            );
            const providerDefaultModel = resolveSelectedModel(
              provider,
              undefined,
              provider.id === defaultProviderId ? defaultModel : undefined
            );

            return (
              <DropdownMenuSub key={provider.id}>
                <DropdownMenuSubTrigger className="gap-2">
                  <ProviderGlyph
                    icon={provider.icon}
                    className="h-4 w-4 text-muted-foreground"
                  />
                  <span>{provider.name}</span>
                  <DropdownMenuShortcut>
                    {normalizedValue.providerId === provider.id
                      ? selectedModel?.name || "Default"
                      : providerDefaultModel?.name || "Default"}
                  </DropdownMenuShortcut>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-72 min-w-[18rem]">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>{provider.name}</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() =>
                      applySelection(provider.id, providerSelection.model)
                    }
                  >
                    <span>Use provider default</span>
                    {normalizedValue.providerId === provider.id &&
                    (normalizedValue.model || "") === (providerSelection.model || "") ? (
                      <Check className="ml-auto h-4 w-4" />
                    ) : null}
                  </DropdownMenuItem>
                  {(provider.models || []).length > 0 ? (
                    <>
                      <DropdownMenuSeparator />
                      {(provider.models || []).map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => applySelection(provider.id, model.id)}
                          className="items-start"
                        >
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span>{model.name}</span>
                            {model.description ? (
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            ) : null}
                            {(model.effortLevels || []).length > 0 ? (
                              <span className="mt-1 text-[10px] text-muted-foreground">
                                Effort:{" "}
                                {(model.effortLevels || [])
                                  .map((effort) => effort.name)
                                  .join(" · ")}
                              </span>
                            ) : null}
                          </div>
                          {normalizedValue.providerId === provider.id &&
                          normalizedValue.model === model.id ? (
                            <Check className="ml-2 h-4 w-4 shrink-0" />
                          ) : null}
                        </DropdownMenuItem>
                      ))}
                    </>
                  ) : null}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          })
        ) : (
          <DropdownMenuItem disabled>No providers available</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
