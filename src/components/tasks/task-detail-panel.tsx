"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/components/i18n/locale-provider";
import { useAppStore } from "@/stores/app-store";
import { ConversationSessionView } from "@/components/agents/conversation-session-view";
import { ConversationRuntimeBadge, buildConversationRuntimeLabel } from "@/components/agents/conversation-runtime-badge";
import { Button } from "@/components/ui/button";
import type {
  ConversationDetail,
  ConversationMeta,
  ConversationStatus,
} from "@/types/conversations";
import { openArtifactPath } from "@/lib/navigation/open-artifact-path";
import type { MessageKey } from "@/lib/i18n/messages";

function StatusDot({ status }: { status: ConversationStatus }) {
  if (status === "running") {
    return <span className="relative flex h-2 w-2 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>;
  }
  if (status === "completed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />;
  }
  if (status === "failed") {
    return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-destructive" />;
  }
  return <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />;
}

function formatRelative(iso: string | undefined, t: (key: MessageKey) => string): string {
  if (!iso) return t("agents.time.justNow");
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return t("agents.time.justNow");
  if (minutes < 60) return t("agents.time.minutesAgo").replace("{minutes}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("agents.time.hoursAgo").replace("{hours}", String(hours));
  return t("agents.time.daysAgo").replace("{days}", String(Math.floor(hours / 24)));
}

function startCase(value: string | undefined, fallback = "General"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function TaskDetailPanel() {
  const { t } = useLocale();
  void t("tasks.detail.loadError");
  const conversation = useAppStore((s) => s.taskPanelConversation);
  const setTaskPanelConversation = useAppStore((s) => s.setTaskPanelConversation);
  const [detail, setDetail] = useState<ConversationDetail | null>(null);

  if (!conversation) return null;
  const activeConversation = detail?.meta.id === conversation.id ? detail.meta : conversation;
  const runtimeLabel = buildConversationRuntimeLabel(activeConversation);

  return (
    <div className="flex h-full w-[420px] shrink-0 flex-col border-l border-border/70 bg-background">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusDot status={activeConversation.status} />
            <p className="truncate text-[13px] font-medium text-foreground">
              {activeConversation.title}
            </p>
          </div>
          <p className="mt-0.5 truncate pl-4 text-[11px] text-muted-foreground">
            {startCase(activeConversation.agentSlug)}
            {" · "}
            {formatRelative(conversation.startedAt, t)}
          </p>
          {runtimeLabel ? (
            <ConversationRuntimeBadge meta={activeConversation} className="mt-1 pl-4" />
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0"
          onClick={() => setTaskPanelConversation(null)}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ConversationSessionView
          conversation={conversation}
          onDetailChange={setDetail}
          onOpenArtifact={(artifactPath) => {
            void openArtifactPath(artifactPath, { type: "page" });
          }}
        />
      </div>
    </div>
  );
}
