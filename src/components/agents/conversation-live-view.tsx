"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Files,
  Loader2,
  PackageOpen,
  RadioTower,
} from "lucide-react";
import type { ConversationDetail } from "@/types/conversations";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { appendConversationCabinetPath } from "@/lib/agents/conversation-identity";
import { ConversationContentViewer } from "@/components/agents/conversation-content-viewer";
import { getArtifactLabel } from "@/lib/navigation/artifact-path";

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "running"
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
      : "text-muted-foreground bg-muted/30 border-border";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${color}`}
    >
      {status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
      {status}
    </span>
  );
}

export function ConversationLiveView({
  detail,
  onOpenArtifact,
  density = "default",
}: {
  detail: ConversationDetail;
  onOpenArtifact?: (path: string) => void;
  density?: "default" | "compact";
}) {
  const transcriptUrl = appendConversationCabinetPath(
    `/agents/conversations/${detail.meta.id}`,
    detail.meta.cabinetPath
  );
  const promptText = detail.request || detail.meta.title;
  const [promptHtml, setPromptHtml] = useState("");
  const [expandedOutputId, setExpandedOutputId] = useState<string | null>(null);
  const isOutputExpanded = expandedOutputId === detail.meta.id;
  const outputPanelId = `conversation-live-output-${detail.meta.id}`;
  const isCompact = density === "compact";

  useEffect(() => {
    let cancelled = false;

    if (!promptText) {
      queueMicrotask(() => {
        if (!cancelled) {
          setPromptHtml("");
        }
      });

      return () => {
        cancelled = true;
      };
    }

    fetch("/api/ai/render-md", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markdown: promptText }),
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) {
          setPromptHtml(data?.html || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPromptHtml("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [promptText]);

  return (
    <ScrollArea
      className="h-full"
      style={{
        backgroundColor: "var(--background)",
        color: "var(--foreground)",
      }}
    >
      <div
        className={cn(
          "mx-auto w-full space-y-5 p-6",
          isCompact ? "space-y-3 p-3" : "max-w-3xl"
        )}
      >
        <section
          className={cn(
            "border border-border bg-muted/10",
            isCompact ? "rounded-lg p-3" : "rounded-2xl p-5"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Prompt
              </h4>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-8 gap-1.5 text-xs", isCompact && "shrink-0 px-2")}
              onClick={() => window.open(transcriptUrl, "_blank", "noopener,noreferrer")}
            >
              <Files className="h-3.5 w-3.5" />
              Open transcript
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
          {promptHtml ? (
            <div
              className={cn(
                "max-h-48 overflow-y-auto overflow-x-hidden prose prose-sm prose-invert max-w-none prose-headings:font-semibold prose-headings:text-foreground prose-h1:text-base prose-h2:text-[13px] prose-h3:text-[12px] prose-p:text-[13px] prose-p:text-foreground/85 prose-li:text-[13px] prose-li:text-foreground/85 prose-a:text-foreground prose-code:text-[11px] prose-code:text-foreground prose-code:bg-background prose-code:px-1 prose-code:rounded prose-pre:bg-background prose-pre:border-0 prose-pre:text-foreground prose-strong:text-foreground",
                isCompact && "max-h-36"
              )}
              dangerouslySetInnerHTML={{ __html: promptHtml }}
            />
          ) : (
            <p
              className={cn(
                "max-h-48 overflow-y-auto overflow-x-hidden break-words text-[13px] leading-relaxed text-foreground/85",
                isCompact && "max-h-36"
              )}
            >
              {promptText}
            </p>
          )}
        </section>

        <section
          className={cn(
            "overflow-hidden border border-border bg-background",
            isCompact ? "rounded-lg" : "rounded-2xl"
          )}
        >
          <div className={cn("flex items-center justify-between gap-3 p-5", isCompact && "p-3")}>
            <button
              type="button"
              className="-m-2 flex min-w-0 flex-1 items-center gap-2 rounded-xl p-2 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-expanded={isOutputExpanded}
              aria-controls={outputPanelId}
              onClick={() =>
                setExpandedOutputId((expandedId) =>
                  expandedId === detail.meta.id ? null : detail.meta.id
                )
              }
            >
              {isOutputExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <RadioTower className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0">
                <h4 className="truncate text-[13px] font-semibold">Live Output</h4>
                <p className="truncate text-[11px] text-muted-foreground">
                  Cabinet is rendering the saved transcript instead of the web terminal.
                </p>
              </div>
            </button>
            <StatusBadge status={detail.meta.status} />
          </div>

          {isOutputExpanded ? (
            <div
              id={outputPanelId}
              className={cn("border-t border-border/60 p-5 pt-4", isCompact && "p-3 pt-3")}
            >
              {detail.transcript ? (
                <div
                  className={cn(
                    "overflow-hidden rounded-xl border border-border/60 bg-muted/10 p-4",
                    isCompact && "rounded-lg p-3"
                  )}
                >
                  <ConversationContentViewer text={detail.transcript} />
                </div>
              ) : (
                <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed border-border px-4 py-10 text-center">
                  <div className="space-y-2 text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    <p className="text-[13px]">Waiting for the first output chunk...</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>

        {detail.artifacts.length > 0 && onOpenArtifact ? (
          <section
            className={cn(
              "border border-border bg-background",
              isCompact ? "rounded-lg p-3" : "rounded-2xl p-5"
            )}
          >
            <div className="mb-4 flex items-center gap-2">
              <PackageOpen className="h-4 w-4 text-primary" />
              <h4 className="text-[13px] font-semibold">
                Artifacts
                <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">
                  ({detail.artifacts.length})
                </span>
              </h4>
            </div>
            <div className="space-y-2">
              {detail.artifacts.map((artifact) => (
                <button
                  key={artifact.path}
                  onClick={() => onOpenArtifact(artifact.path)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3 text-left transition-colors hover:border-primary/30 hover:bg-muted/40"
                >
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-foreground">
                      {artifact.label || getArtifactLabel(artifact.path)}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {artifact.path}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ScrollArea>
  );
}
