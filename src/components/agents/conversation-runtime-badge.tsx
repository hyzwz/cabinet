"use client";

import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEffortName } from "@/lib/agents/runtime-options";
import type { ConversationMeta } from "@/types/conversations";

function readConversationModel(meta: Pick<ConversationMeta, "adapterConfig">): string | null {
  const config = meta.adapterConfig;
  if (!config || typeof config !== "object") return null;
  const model = config.model;
  return typeof model === "string" && model.trim() ? model.trim() : null;
}

function readConversationEffort(meta: Pick<ConversationMeta, "adapterConfig">): string | null {
  const config = meta.adapterConfig;
  if (!config || typeof config !== "object") return null;
  const effort =
    typeof config.effort === "string" && config.effort.trim()
      ? config.effort
      : typeof config.reasoningEffort === "string" && config.reasoningEffort.trim()
        ? config.reasoningEffort
        : null;

  return effort ? formatEffortName(effort) : null;
}

function formatProviderLabel(providerId?: string): string | null {
  if (!providerId) return null;

  return providerId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((segment) => {
      const upper = segment.toUpperCase();
      if (upper === "API" || upper === "CLI") return upper;
      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
}

export function buildConversationRuntimeLabel(
  meta: Pick<ConversationMeta, "adapterConfig" | "providerId" | "adapterType">
): string | null {
  const model = readConversationModel(meta);
  const effort = readConversationEffort(meta);
  const provider = formatProviderLabel(meta.providerId);
  const adapter =
    typeof meta.adapterType === "string" && meta.adapterType.trim()
      ? meta.adapterType.trim()
      : null;

  if (model && provider && effort) {
    return adapter ? `${model} · ${provider} · ${effort} · ${adapter}` : `${model} · ${provider} · ${effort}`;
  }
  if (model && provider) return adapter ? `${model} · ${provider} · ${adapter}` : `${model} · ${provider}`;
  if (model && effort) return `${model} · ${effort}`;
  if (model) return model;
  if (provider && effort) return adapter ? `${provider} · ${effort} · ${adapter}` : `${provider} · ${effort}`;
  if (provider) return adapter ? `${provider} · ${adapter}` : `${provider} · default model`;
  if (adapter) return adapter;
  return null;
}

export function ConversationRuntimeBadge({
  meta,
  className,
}: {
  meta: Pick<ConversationMeta, "adapterConfig" | "providerId" | "adapterType">;
  className?: string;
}) {
  const label = buildConversationRuntimeLabel(meta);
  if (!label) return null;

  return (
    <div className={cn("flex items-center gap-1.5 text-[11px] text-muted-foreground", className)}>
      <BrainCircuit className="size-3.5 shrink-0" />
      <p className="truncate">{label}</p>
    </div>
  );
}
