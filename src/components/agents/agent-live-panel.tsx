"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Zap,
  Loader2,
  X,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLocale } from "@/components/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { ConversationSessionView } from "@/components/agents/conversation-session-view";
import { ConversationRuntimeBadge } from "@/components/agents/conversation-runtime-badge";
import { HeartbeatHydrationBadge } from "@/components/agents/heartbeat-hydration-badge";
import { LegacyHeartbeatFallbackCard } from "@/components/agents/legacy-heartbeat-fallback-card";
import { LegacyHeartbeatSection } from "@/components/agents/legacy-heartbeat-section";
import { LiveFallbackStatusBar } from "@/components/agents/live-fallback-status-bar";
import {
  useAIPanelStore,
  type AgentLiveSession,
} from "@/stores/ai-panel-store";
import type { AgentPersona, HeartbeatRecord } from "@/lib/agents/persona-manager";
import type { ConversationMeta, ConversationStatus } from "@/types/conversations";

interface AgentLivePanelProps {
  persona: AgentPersona;
  onBack: () => void;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function AgentLivePanel({ persona, onBack }: AgentLivePanelProps) {
  const { t, format } = useLocale();
  const [history, setHistory] = useState<HeartbeatRecord[]>([]);
  const [expandedPast, setExpandedPast] = useState<Set<string>>(new Set());
  const [selectedHistoryConversation, setSelectedHistoryConversation] = useState<string | null>(null);
  const [historyHydration, setHistoryHydration] = useState<{
    total: number;
    withConversationId: number;
    hydrated: number;
    missingConversationId: number;
    missingMeta: number;
  } | null>(null);
  const [historyHydrationRefreshKey, setHistoryHydrationRefreshKey] = useState<string | null>(null);
  const autoHydratedLegacyIdsRef = useRef<Set<string>>(new Set());
  const [running, setRunning] = useState(false);
  const [sessionTargets, setSessionTargets] = useState<Record<string, { id: string; cabinetPath: string; status: ConversationStatus }>>({});
  const [terminalFallbackSessions, setTerminalFallbackSessions] = useState<Record<string, true>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    agentSessions,
    addAgentSession,
    markAgentSessionCompleted,
    removeAgentSession,
    restoreAgentSessionsFromStorage,
  } = useAIPanelStore();

  // Restore sessions from sessionStorage on mount
  useEffect(() => {
    restoreAgentSessionsFromStorage();
  }, [restoreAgentSessionsFromStorage]);

  const currentSessions = agentSessions.filter(
    (s) => s.slug === persona.slug && s.status === "running"
  );
  const historyConversations = useMemo<ConversationMeta[]>(() => {
    return history
      .filter((hb): hb is HeartbeatRecord & { conversationId: string } =>
        typeof hb.conversationId === "string" && hb.conversationId.trim().length > 0
      )
      .map((hb, index) => ({
        id: hb.conversationId,
        agentSlug: hb.agentSlug || persona.slug,
        cabinetPath: persona.cabinetPath || "/",
        title:
          hb.summary
            ?.replace(/^---\s*\n/, "")
            ?.replace(/^#+\s*/, "")
            ?.split("\n")[0]
            ?.trim() || `${persona.name} session ${index + 1}`,
        trigger: "heartbeat" as const,
        status: (hb.status === "completed" ? "completed" : "failed") as ConversationStatus,
        startedAt: hb.timestamp,
        completedAt: new Date(new Date(hb.timestamp).getTime() + hb.duration).toISOString(),
        exitCode: hb.status === "completed" ? 0 : 1,
        providerId: hb.providerId || persona.provider,
        adapterType: hb.adapterType || persona.adapterType,
        promptPath: "",
        transcriptPath: "",
        mentionedPaths: [],
        artifactPaths: [],
        summary: hb.summary,
      }));
  }, [history, persona.adapterType, persona.cabinetPath, persona.name, persona.provider, persona.slug]);
  const selectedHistoryMeta =
    selectedHistoryConversation
      ? historyConversations.find((conversation) => conversation.id === selectedHistoryConversation) || null
      : null;
  const currentSession = currentSessions[currentSessions.length - 1] ?? null;
  const currentSessionTarget = currentSession?.conversationId
    ? sessionTargets[currentSession.sessionId] ?? {
        id: currentSession.conversationId,
        cabinetPath: "/",
        status: currentSession.status as ConversationStatus,
      }
    : null;
  const otherRunningSessions = agentSessions.filter(
    (s) => s.slug !== persona.slug && s.status === "running"
  );

  const fetchHistory = useCallback(async () => {
    const res = await fetch(`/api/agents/personas/${persona.slug}`);
    if (res.ok) {
      const data = await res.json();
      setHistory((data.history || []).slice(0, 20));
      setHistoryHydration(data.historyHydration || null);
    }
  }, [persona.slug]);

  const attemptHistoryHydration = useCallback(
    async (conversationId: string) => {
      try {
        const params = new URLSearchParams({ conversationId });
        if (persona.cabinetPath) {
          params.set("cabinetPath", persona.cabinetPath);
        }
        const response = await fetch(`/api/agents/conversations?${params.toString()}`);
        if (!response.ok) return;
        const data = await response.json();
        if (!data?.conversation?.id) return;
        setHistoryHydrationRefreshKey(conversationId);
        await fetchHistory();
      } catch {
        // Ignore opportunistic hydration refresh failures.
      } finally {
        setHistoryHydrationRefreshKey((current) =>
          current === conversationId ? null : current
        );
      }
    },
    [fetchHistory, persona.cabinetPath]
  );

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    const candidate = history.find(
      (hb) =>
        typeof hb.conversationId === "string" &&
        hb.conversationId.trim().length > 0 &&
        !hb.conversation &&
        !autoHydratedLegacyIdsRef.current.has(hb.conversationId) &&
        historyHydrationRefreshKey !== hb.conversationId
    );

    if (!candidate?.conversationId) {
      return;
    }

    autoHydratedLegacyIdsRef.current.add(candidate.conversationId);
    void attemptHistoryHydration(candidate.conversationId);
  }, [attemptHistoryHydration, history, historyHydrationRefreshKey]);

  useEffect(() => {
    let cancelled = false;

    async function hydrateSessionTargets() {
      const sessionsToHydrate = currentSessions.filter(
        (session) => session.conversationId && !sessionTargets[session.sessionId]
      );

      if (sessionsToHydrate.length === 0) {
        return;
      }

      const updates = await Promise.all(
        sessionsToHydrate.map(async (session) => {
          try {
            const response = await fetch(
              `/api/agents/conversations?conversationId=${encodeURIComponent(session.conversationId!)}`
            );
            if (!response.ok) {
              return null;
            }
            const data = await response.json();
            const conversation = data?.conversation;
            if (!conversation?.id) {
              return null;
            }
            return [
              session.sessionId,
              {
                id: conversation.id,
                cabinetPath: conversation.cabinetPath || "/",
                status: (conversation.status || session.status) as ConversationStatus,
              },
            ] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) {
        return;
      }

      const nextEntries = updates.filter(
        (entry): entry is readonly [string, { id: string; cabinetPath: string; status: ConversationStatus }] =>
          entry !== null
      );

      if (nextEntries.length > 0) {
        setSessionTargets((prev) => ({
          ...prev,
          ...Object.fromEntries(nextEntries),
        }));
      }
    }

    void hydrateSessionTargets();

    return () => {
      cancelled = true;
    };
  }, [currentSessions, sessionTargets]);

  // Scroll to bottom when new sessions appear
  useEffect(() => {
    if (currentSessions.length > 0 && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentSessions.length]);

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await fetch(`/api/agents/personas/${persona.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "run" }),
      });
      const data = await res.json();
      if (data.ok && data.sessionId) {
        addAgentSession({
          sessionId: data.sessionId,
          slug: persona.slug,
          personaName: persona.name,
          personaEmoji: persona.emoji,
          timestamp: Date.now(),
          status: "running",
          conversationId: data.conversationId,
          providerId: data.providerId,
          adapterType: data.adapterType,
        });
      }
    } finally {
      setRunning(false);
    }
  };

  const handleSessionEnd = useCallback(
    async (sessionId: string) => {
      markAgentSessionCompleted(sessionId);
      setTerminalFallbackSessions((prev) => {
        if (!prev[sessionId]) return prev;
        const next = { ...prev };
        delete next[sessionId];
        return next;
      });
      setSelectedHistoryConversation(null);
      // Refresh history after a brief delay to let post-processing catch up
      setTimeout(fetchHistory, 2000);
    },
    [markAgentSessionCompleted, fetchHistory]
  );

  const toggleExpanded = (id: string) => {
    setExpandedPast((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const hasAnySessions = currentSessions.length > 0 || history.length > 0;
  const legacyHistory = history.filter((hb) => !hb.conversationId && !hb.conversation);
  const summaryOnlyCount = legacyHistory.length;
  const visibleHistory = legacyHistory.slice(0, 2);
  const hiddenLegacyCount = Math.max(0, summaryOnlyCount - visibleHistory.length);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 -ml-1"
            onClick={onBack}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Bot className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold tracking-[-0.02em]">
            {persona.emoji ? `${persona.emoji} ` : ""}{persona.name}
          </span>
          <span className="text-[11px] text-muted-foreground">{persona.heartbeat}</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>{persona.heartbeatsUsed || 0}/{persona.budget}</span>
        </div>
      </div>

      {/* Sessions area */}
      <div
        className={cn(
          "flex-1 min-h-0 flex flex-col",
          "overflow-y-auto"
        )}
        ref={scrollRef}
      >
        <div
          className={cn(
            "p-3 space-y-3",
            currentSessions.length > 0 ? "flex-1 flex flex-col" : ""
          )}
        >
          {/* Empty state */}
          {!hasAnySessions && !running && (
            <div className="text-center py-12 space-y-2">
              <Bot className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">
                {t("agents.live.empty")}
              </p>
            </div>
          )}

          {/* Running on other agents */}
          {otherRunningSessions.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1">
                {t("agents.live.otherRunning")}
              </div>
              {otherRunningSessions.map((session) => (
                <div
                  key={session.sessionId}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/60 px-3 py-2 text-[12px]"
                >
                  <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
                  <span className="truncate flex-1 text-muted-foreground">
                    {session.personaEmoji} {session.personaName}
                  </span>
                  <button
                    onClick={() => removeAgentSession(session.sessionId)}
                    className="text-muted-foreground/40 hover:text-destructive shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Past sessions */}
          {(historyConversations.length > 0 || visibleHistory.length > 0) && (
            <div className="space-y-1.5">
              {currentSessions.length > 0 && (
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1">
                  {t("agents.live.previousSessions")}
                </div>
              )}
              {historyConversations.map((conversation) => {
                const date = new Date(conversation.startedAt);
                const duration = conversation.completedAt
                  ? Math.max(
                      0,
                      Math.round(
                        (new Date(conversation.completedAt).getTime() -
                          new Date(conversation.startedAt).getTime()) /
                          1000
                      )
                    )
                  : null;
                const selected = selectedHistoryConversation === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    onClick={() =>
                      setSelectedHistoryConversation((current) =>
                        current === conversation.id ? null : conversation.id
                      )
                    }
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg border border-border/70 bg-background/40 px-3 py-2 text-left transition-colors",
                      selected
                        ? "bg-accent/40 text-foreground"
                        : "hover:bg-accent/30"
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      {conversation.status === "completed" ? (
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[12px] font-medium leading-tight">
                          {conversation.title}
                        </p>
                        {selected ? (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-primary">
                            open
                          </span>
                        ) : null}
                      </div>
                      <ConversationRuntimeBadge meta={conversation} className="mt-1" />
                      <p className="mt-1 text-[10px] text-muted-foreground/60">
                        {date.toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        {date.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {duration !== null ? <span className="ml-1.5">{duration}s</span> : null}
                      </p>
                    </div>
                  </button>
                );
              })}
              {visibleHistory.map((hb) => {
                const derivedConversation = hb.conversation;
                const selected = derivedConversation
                  ? selectedHistoryConversation === derivedConversation.id
                  : expandedPast.has(hb.timestamp);
                const date = new Date(hb.timestamp);
                const duration = hb.duration > 0 ? Math.round(hb.duration / 1000) : null;
                const hasSummary = typeof hb.summary === "string" && hb.summary.trim().length > 0;

                return (
                  <div
                    key={hb.conversationId || hb.timestamp}
                    className="overflow-hidden rounded-lg border border-border/70 bg-background/40"
                  >
                    <button
                      onClick={() => {
                        if (derivedConversation?.id) {
                          setSelectedHistoryConversation((current) =>
                            current === derivedConversation.id ? null : derivedConversation.id
                          );
                          return;
                        }
                        toggleExpanded(hb.timestamp);
                      }}
                      className={cn(
                        "w-full flex items-start gap-2 px-3 py-2 text-left transition-colors",
                        selected ? "bg-accent/40 text-foreground" : "hover:bg-accent/30"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {hb.status === "completed" ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-[12px] font-medium leading-tight">
                            {derivedConversation?.title || formatRelative(hb.timestamp)}
                          </p>
                          {derivedConversation?.id && selected ? (
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-primary">
                              {t("agents.history.open")}
                            </span>
                          ) : null}
                          {!derivedConversation ? (
                            <span className="rounded-full border border-border/80 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                              {t("agents.history.legacySummary")}
                            </span>
                          ) : null}
                        </div>
                        {derivedConversation ? (
                          <ConversationRuntimeBadge meta={derivedConversation} className="mt-1" />
                        ) : (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground/70">
                            <span>{t("agents.history.transcriptMetadataUnavailable")}</span>
                            {hb.conversationId ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (!historyHydrationRefreshKey && hb.conversationId) {
                                    void attemptHistoryHydration(hb.conversationId);
                                  }
                                }}
                                disabled={historyHydrationRefreshKey === hb.conversationId}
                                className="rounded border border-border/70 px-1.5 py-0.5 text-[9px] font-medium text-foreground transition-colors hover:bg-accent/40 disabled:cursor-wait disabled:opacity-60"
                              >
                                {historyHydrationRefreshKey === hb.conversationId
                                  ? t("agents.history.checkingTranscript")
                                  : t("agents.history.retryHydrate")}
                              </button>
                            ) : null}
                          </div>
                        )}
                        <p className="mt-1 text-[10px] text-muted-foreground/60">
                          {date.toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                          })}{" "}
                          {date.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {duration !== null ? <span className="ml-1.5">{duration}s</span> : null}
                        </p>
                      </div>
                      {!derivedConversation ? (
                        expandedPast.has(hb.timestamp) ? (
                          <ChevronDown className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="mt-0.5 h-3 w-3 text-muted-foreground shrink-0" />
                        )
                      ) : null}
                    </button>
                    {derivedConversation?.id ? (
                      selected ? (
                        <div className="border-t border-border/70 bg-background">
                          <div className="h-[360px]">
                            <ConversationSessionView
                              conversation={{
                                id: derivedConversation.id,
                                cabinetPath: derivedConversation.cabinetPath || "/",
                                status: derivedConversation.status,
                              }}
                              onOpenArtifact={(path) => window.open(path, "_blank")}
                            />
                          </div>
                        </div>
                      ) : null
                    ) : expandedPast.has(hb.timestamp) ? (
                      <LegacyHeartbeatFallbackCard
                        record={hb}
                        expanded={true}
                        onToggle={() => toggleExpanded(hb.timestamp)}
                        className="border-0 rounded-none bg-transparent"
                      />
                    ) : null}
                  </div>
                );
              })}
              <LegacyHeartbeatSection
                records={visibleHistory.filter((hb) => !hb.conversation)}
                hiddenCount={hiddenLegacyCount}
                expandedKeys={expandedPast}
                onToggle={toggleExpanded}
                summaryPreviewLines={3}
                summaryLabel={
                  summaryOnlyCount > visibleHistory.length
                    ? {
                        visible: visibleHistory.length,
                        hidden: summaryOnlyCount - visibleHistory.length,
                      }
                    : null
                }
                className="space-y-2 opacity-85"
              />
              <HeartbeatHydrationBadge hydration={historyHydration} />
            </div>
          )}

          {selectedHistoryMeta ? (
            <div className="min-h-[220px] overflow-hidden rounded-lg border border-border/70 bg-background">
              <ConversationSessionView
                conversation={selectedHistoryMeta}
                onOpenArtifact={() => {}}
              />
            </div>
          ) : null}

          {/* Divider */}
          {history.length > 0 && currentSession && (
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-1 pt-2">
              {t("agents.live.currentSession")}
            </div>
          )}

          {/* Live running session */}
          {currentSession && (
            <div className="space-y-2 flex flex-col flex-1 min-h-0">
              <div className="flex items-center gap-2 shrink-0">
                <div className="bg-accent/50 rounded-lg px-3 py-2 text-[13px] leading-relaxed flex-1">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500 shrink-0" />
                    <span>{t("agents.live.running")}</span>
                  </div>
                  {currentSessionTarget ? (
                    <ConversationRuntimeBadge
                      meta={{
                        providerId: currentSession.providerId,
                        adapterType: currentSession.adapterType,
                        adapterConfig: undefined,
                      }}
                      className="mt-1 pl-5"
                    />
                  ) : currentSession.providerId || currentSession.adapterType ? (
                    <ConversationRuntimeBadge
                      meta={{
                        providerId: currentSession.providerId,
                        adapterType: currentSession.adapterType,
                        adapterConfig: undefined,
                      }}
                      className="mt-1 pl-5"
                    />
                  ) : null}
                </div>
                <button
                  onClick={() => removeAgentSession(currentSession.sessionId)}
                  className="text-muted-foreground/40 hover:text-destructive shrink-0 p-1"
                  title={t("agents.live.dismiss")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-[200px] overflow-hidden rounded-lg border border-border/70 bg-background">
                {currentSessionTarget && !terminalFallbackSessions[currentSession.sessionId] ? (
                  <ConversationSessionView
                    conversation={currentSessionTarget}
                    onOpenArtifact={() => {}}
                    onMissingDetail={() => {
                      setTerminalFallbackSessions((prev) =>
                        prev[currentSession.sessionId]
                          ? prev
                          : { ...prev, [currentSession.sessionId]: true }
                      );
                    }}
                    errorLabel="Waiting for live transcript..."
                  />
                ) : (
                  <div className="relative h-full">
                    {currentSessionTarget ? <LiveFallbackStatusBar /> : null}
                    <WebTerminal
                      sessionId={currentSession.sessionId}
                      reconnect={currentSession.reconnect ?? true}
                      themeSurface="page"
                      onClose={() => handleSessionEnd(currentSession.sessionId)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden terminals for other running agent sessions — keep WS alive */}
      {otherRunningSessions.map((session) => (
        <div
          key={`hidden-${session.sessionId}`}
          data-terminal-keepalive="agent-session"
          style={{ width: 0, height: 0, overflow: "hidden", position: "absolute" }}
        >
          <WebTerminal
            sessionId={session.sessionId}
            reconnect={true}
            preserveConnectionOnly={true}
            themeSurface="page"
            onClose={() => markAgentSessionCompleted(session.sessionId)}
          />
        </div>
      ))}

      {/* Bottom bar */}
      <div className="border-t border-border p-3 shrink-0 flex items-center gap-2">
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          onClick={handleRun}
          disabled={running || !persona.active}
        >
          {running ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Zap className="h-3.5 w-3.5" />
          )}
          {running ? t("agents.live.starting") : t("agents.live.runNow")}
        </Button>
        {!persona.active && (
          <span className="text-[11px] text-muted-foreground">{t("agents.live.paused")}</span>
        )}
      </div>
    </div>
  );
}
