"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Sparkles,
  Trash2,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAIPanelStore } from "@/stores/ai-panel-store";
import { useEditorStore } from "@/stores/editor-store";
import { useAppStore } from "@/stores/app-store";
import { useTreeStore } from "@/stores/tree-store";
import { WebTerminal } from "@/components/terminal/web-terminal";
import { ConversationSessionView } from "@/components/agents/conversation-session-view";
import { ConversationRuntimeBadge } from "@/components/agents/conversation-runtime-badge";
import type { ConversationMeta } from "@/types/conversations";
import type { AgentListItem } from "@/types/agents";
import { createConversation } from "@/lib/agents/conversation-client";
import { flattenTree } from "@/lib/tree-utils";
import { ComposerInput } from "@/components/composer/composer-input";
import { useComposer, type MentionableItem } from "@/hooks/use-composer";
import { useLocale } from "@/components/i18n/locale-provider";

interface PastSession {
  id: string;
  pagePath: string;
  cabinetPath?: string;
  instruction: string;
  timestamp: string;
  duration?: number;
  status: "completed" | "failed" | "cancelled";
  summary: string;
}

interface PendingLiveSession {
  id: string;
  pagePath: string;
  userMessage: string;
  agentSlug: string;
  timestamp: number;
  status: "starting" | "failed";
  error?: string;
}

type LiveSessionView =
  | {
      kind: "pending";
      id: string;
      pagePath: string;
      agentSlug: string;
      userMessage: string;
      timestamp: number;
      status: "starting" | "failed";
      error?: string;
    }
  | {
      kind: "running";
      id: string;
      sessionId: string;
      conversationId?: string;
      cabinetPath?: string;
      pagePath: string;
      agentSlug: string;
      userMessage: string;
      prompt: string;
      timestamp: number;
      reconnect?: boolean;
      providerId?: string;
      adapterType?: string;
    };

function startCase(value: string | undefined, fallback = "Editor"): string {
  if (!value) return fallback;
  const words = value.trim().split(/[\s_-]+/).filter(Boolean);
  if (words.length === 0) return fallback;
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function AIPanel() {
  const {
    isOpen,
    close,
    editorSessions,
    addEditorSession,
    markSessionCompleted,
    removeSession,
    clearAllSessions,
  } = useAIPanelStore();
  const { currentPath, loadPage } = useEditorStore();
  const treeNodes = useTreeStore((s) => s.nodes);
  const selectedPath = useTreeStore((s) => s.selectedPath);
  const targetPath = selectedPath || currentPath;
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [selectedHistoryConversation, setSelectedHistoryConversation] = useState<string | null>(null);
  const [pendingSessions, setPendingSessions] = useState<PendingLiveSession[]>([]);
  const [selectedLiveSessionId, setSelectedLiveSessionId] = useState<string | null>(null);
  const [imageSubmitting, setImageSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const previousCurrentPathRef = useRef<string | null>(null);
  const { t, format } = useLocale();

  // Build mentionable items from tree + agents
  const mentionItems: MentionableItem[] = [
    ...agents
      .filter((a) => a.slug !== "editor")
      .map((a) => ({
        type: "agent" as const,
        id: a.slug,
        label: a.name,
        sublabel: a.role || "",
        icon: a.emoji,
      })),
    ...flattenTree(treeNodes).map((p) => ({
      type: "page" as const,
      id: p.path,
      label: p.title,
      sublabel: p.path,
    })),
  ];

  const loadPastSessions = useCallback(async () => {
    if (!targetPath || !isOpen) return;
    try {
      const res = await fetch(
        `/api/agents/conversations?agent=editor&pagePath=${encodeURIComponent(targetPath)}&limit=20`
      );
      if (!res.ok) return;

      const data = await res.json();
      const conversations = (data.conversations || []) as ConversationMeta[];
      const nextSessions = conversations
        .filter((conversation) => conversation.status !== "running")
        .map((conversation) => {
          const duration = conversation.completedAt
            ? Math.max(
                0,
                Math.round(
                  (new Date(conversation.completedAt).getTime() -
                    new Date(conversation.startedAt).getTime()) /
                    1000
                )
              )
            : undefined;

          return {
            id: conversation.id,
            pagePath: targetPath,
            cabinetPath: conversation.cabinetPath,
            instruction: conversation.title,
            timestamp: conversation.startedAt,
            duration,
            status:
              conversation.status === "failed"
                ? "failed"
                : conversation.status === "cancelled"
                  ? "cancelled"
                  : "completed",
            summary: conversation.summary || "",
          } satisfies PastSession;
        });

      setPastSessions(nextSessions);
    } catch {}
  }, [targetPath, isOpen]);

  const runningSessions = useMemo(
    () => editorSessions.filter((session) => session.status === "running"),
    [editorSessions]
  );

  const liveSessions = useMemo<LiveSessionView[]>(() => {
    const pending = pendingSessions.map((session) => ({
      kind: "pending" as const,
      id: session.id,
      pagePath: session.pagePath,
      agentSlug: session.agentSlug,
      userMessage: session.userMessage,
      timestamp: session.timestamp,
      status: session.status,
      error: session.error,
    }));

    const running = runningSessions.map((session) => ({
      kind: "running" as const,
      id: session.sessionId,
      sessionId: session.sessionId,
      conversationId: session.conversationId,
      cabinetPath: session.cabinetPath,
      pagePath: session.pagePath,
      agentSlug: session.agentSlug || "editor",
      userMessage: session.userMessage,
      prompt: session.prompt,
      timestamp: session.timestamp,
      reconnect: session.reconnect,
      providerId: session.providerId,
      adapterType: session.adapterType,
    }));

    return [...pending, ...running].sort((left, right) => {
      const leftCurrent = left.pagePath === targetPath ? 0 : 1;
      const rightCurrent = right.pagePath === targetPath ? 0 : 1;
      if (leftCurrent !== rightCurrent) return leftCurrent - rightCurrent;
      return right.timestamp - left.timestamp;
    });
  }, [targetPath, pendingSessions, runningSessions]);

  const selectedLiveSession = useMemo(
    () => liveSessions.find((session) => session.id === selectedLiveSessionId) || null,
    [liveSessions, selectedLiveSessionId]
  );

  const historyConversations = useMemo<ConversationMeta[]>(() => {
    return pastSessions.map((session) => ({
      id: session.id,
      agentSlug: "editor",
      cabinetPath: session.cabinetPath,
      title: session.instruction,
      trigger: "manual" as const,
      status: session.status,
      startedAt: session.timestamp,
      completedAt:
        session.duration !== undefined
          ? new Date(new Date(session.timestamp).getTime() + session.duration * 1000).toISOString()
          : undefined,
      exitCode:
        session.status === "completed"
          ? 0
          : session.status === "cancelled"
            ? null
            : 1,
      providerId: undefined,
      adapterType: undefined,
      promptPath: "",
      transcriptPath: "",
      mentionedPaths: [],
      artifactPaths: [],
      summary: session.summary,
    }));
  }, [pastSessions]);

  const selectedHistoryMeta = useMemo(
    () =>
      selectedHistoryConversation
        ? historyConversations.find((conversation) => conversation.id === selectedHistoryConversation) || null
        : null,
    [historyConversations, selectedHistoryConversation]
  );

  // Restore sessions from sessionStorage on mount and validate against terminal server
  useEffect(() => {
    const restore = async () => {
      useAIPanelStore.getState().restoreSessionsFromStorage();

      // Check which restored sessions are still alive on the terminal server
      try {
        const res = await fetch("/api/daemon/sessions");
        if (res.ok) {
          const serverSessions: { id: string; exited: boolean }[] = await res.json();
          const aliveIds = new Set(serverSessions.filter((s) => !s.exited).map((s) => s.id));
          const exitedIds = new Set(serverSessions.filter((s) => s.exited).map((s) => s.id));

          const state = useAIPanelStore.getState();
          for (const session of state.editorSessions) {
            if (session.status === "running" && session.reconnect) {
              if (exitedIds.has(session.sessionId)) {
                // Process finished while we were away — mark completed
                state.markSessionCompleted(session.sessionId);
              } else if (!aliveIds.has(session.sessionId)) {
                // Session no longer exists on server at all — remove it
                state.removeSession(session.sessionId);
              }
              // If alive, it stays as reconnect=true and the WebTerminal will reconnect
            }
          }
        }
      } catch {
        // Terminal server not reachable — clear all reconnect sessions
        const state = useAIPanelStore.getState();
        for (const session of state.editorSessions) {
          if (session.reconnect) {
            state.removeSession(session.sessionId);
          }
        }
      }
    };
    restore();
  }, []);

  // Load agents for @ mentions
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const res = await fetch("/api/cabinets/overview?path=.&visibility=all");
        if (res.ok) {
          const data = await res.json();
          const overview = (data.agents || []).map((a: Record<string, unknown>) => ({
            name: a.name as string,
            slug: a.slug as string,
            emoji: (a.emoji as string) || "",
            role: (a.role as string) || "",
            active: a.active as boolean,
          })) as AgentListItem[];
          setAgents(overview);
        }
      } catch {}
    };
    load();
  }, [isOpen]);

  // Load past sessions when page changes
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadPastSessions();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loadPastSessions]);

  useEffect(() => {
    const selectedStillExists =
      !!selectedLiveSessionId && liveSessions.some((session) => session.id === selectedLiveSessionId);
    if (selectedStillExists) return;

    const fallbackSession =
      liveSessions.find((session) => session.pagePath === targetPath) || liveSessions[0] || null;
    queueMicrotask(() => setSelectedLiveSessionId(fallbackSession?.id || null));
  }, [targetPath, liveSessions, selectedLiveSessionId]);

  useEffect(() => {
    if (previousCurrentPathRef.current === targetPath) return;
    previousCurrentPathRef.current = targetPath;
    const currentPageLive = liveSessions.find((session) => session.pagePath === targetPath);
    if (currentPageLive) {
      queueMicrotask(() => setSelectedLiveSessionId(currentPageLive.id));
    }
  }, [targetPath, liveSessions]);

  const startEditorConversation = useCallback(async (input: {
    message: string;
    mentionedPaths: string[];
    mentionedAgents?: string[];
    intent?: "image_generation";
  }) => {
    if (!targetPath) return;

    // If user @-mentioned an agent, route to that agent instead of editor.
    // Image generation always stays with the editor so the asset lands next to the current page.
    const targetAgent =
      input.intent === "image_generation"
        ? null
        : (input.mentionedAgents || [])[0] || null;
    const nextAgentSlug = targetAgent || "editor";
    const pendingId = `pending-${Date.now()}-${crypto.randomUUID()}`;

    setPendingSessions((prev) => [
      ...prev,
      {
        id: pendingId,
        pagePath: targetPath,
        userMessage: input.message,
        agentSlug: nextAgentSlug,
        timestamp: Date.now(),
        status: "starting",
      },
    ]);
    setSelectedLiveSessionId(pendingId);
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = 0;
      }
    });

    try {
      const data = await createConversation(
        targetAgent
          ? {
              agentSlug: targetAgent,
              userMessage: input.message,
              mentionedPaths: input.mentionedPaths,
            }
          : {
              source: "editor",
              pagePath: targetPath,
              userMessage: input.message,
              mentionedPaths: input.mentionedPaths,
              intent: input.intent,
            }
      );
      const conversation = data.conversation as ConversationMeta;

      setPendingSessions((prev) => prev.filter((session) => session.id !== pendingId));
      addEditorSession({
        id: conversation.id,
        sessionId: conversation.id,
        pagePath: targetPath,
        agentSlug: conversation.agentSlug,
        userMessage: input.message,
        prompt: conversation.title,
        timestamp: Date.now(),
        status: "running",
        reconnect: true,
        conversationId: conversation.id,
        cabinetPath: conversation.cabinetPath,
        providerId: conversation.providerId,
        adapterType: conversation.adapterType,
      });
      setSelectedLiveSessionId(conversation.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error && error.message ? error.message : t("aiPanel.pendingFailed");
      setPendingSessions((prev) =>
        prev.map((session) =>
          session.id === pendingId
            ? { ...session, status: "failed", error: errorMessage }
            : session
        )
      );
      throw error;
    }
  }, [addEditorSession, targetPath, t]);

  const composer = useComposer({
    items: mentionItems,
    disabled: !targetPath,
    onSubmit: async ({ message, mentionedPaths, mentionedAgents }) => {
      await startEditorConversation({ message, mentionedPaths, mentionedAgents });
    },
  });

  const handleImageGeneration = useCallback(async () => {
    if (!targetPath || !composer.input.trim() || imageSubmitting) return;
    setImageSubmitting(true);
    const message = composer.input.trim();
    const mentionedPaths = [...composer.mentions.paths];
    try {
      await startEditorConversation({
        message,
        mentionedPaths,
        intent: "image_generation",
      });
      composer.reset();
    } finally {
      setImageSubmitting(false);
    }
  }, [composer, imageSubmitting, startEditorConversation, targetPath]);

  // Keep newest live work visible
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [liveSessions.length]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => composer.textareaRef.current?.focus(), 100);
    }
  }, [composer.textareaRef, isOpen]);

  const handleSessionEnd = useCallback(
    async (sessionId: string) => {
      const session = useAIPanelStore
        .getState()
        .editorSessions.find((s) => s.sessionId === sessionId);
      markSessionCompleted(sessionId);
      await loadPastSessions();
      setSelectedHistoryConversation((current) => (current === sessionId ? null : current));

      // Reload the current page if we're still on it
      const currentPagePath = useEditorStore.getState().currentPath;
      const activeTargetPath =
        useTreeStore.getState().selectedPath || currentPagePath;
      window.dispatchEvent(
        new CustomEvent("cabinet:asset-updated", {
          detail: { path: session?.pagePath || sessionId },
        })
      );
      if (session && currentPagePath === session.pagePath && activeTargetPath === session.pagePath) {
        setTimeout(() => loadPage(session.pagePath), 500);
      }
    },
    [loadPage, loadPastSessions, markSessionCompleted]
  );

  const formatTime = (ts: string | number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (ts: string | number) => {
    const d = new Date(ts);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const toggleHistorySelection = (conversationId: string) => {
    setSelectedHistoryConversation((current) =>
      current === conversationId ? null : conversationId
    );
  };

  if (!isOpen) return null;

  const hasAnySessions =
    liveSessions.length > 0 ||
    pastSessions.length > 0 ||
    runningSessions.length > 0;

  const dismissLiveSession = (session: LiveSessionView) => {
    if (session.kind === "pending") {
      setPendingSessions((prev) => prev.filter((entry) => entry.id !== session.id));
      return;
    }
    removeSession(session.sessionId);
  };

  const mentionHint = format("aiPanel.emptyMentionHint", { mention: "@" });
  const [mentionHintBefore, mentionHintAfter] = mentionHint.split("@");

  return (
    <div className="w-[520px] min-w-[460px] shrink-0 border-l border-border bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-[13px] font-semibold tracking-[-0.02em]">
            {t("aiPanel.title")}
          </span>
          {targetPath && (
            <span className="text-[11px] text-muted-foreground">
              {targetPath.split("/").pop()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {hasAnySessions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title={t("aiPanel.clearAll")}
              onClick={() => {
                clearAllSessions();
                setPendingSessions([]);
                setSelectedLiveSessionId(null);
                setPastSessions([]);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sessions */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto" ref={scrollRef}>
        <div className="px-5 py-4 space-y-5">
          {!hasAnySessions && (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="h-8 w-8 mx-auto text-muted-foreground/40" />
              <p className="text-[13px] text-muted-foreground">
                {t("aiPanel.emptyPrompt")}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {mentionHintBefore}
                <span className="font-mono bg-muted px-1 rounded">@</span> to
                {mentionHintAfter}
              </p>
              <p className="text-xs text-muted-foreground/60">
                {t("aiPanel.emptyPersistHint")}
              </p>
            </div>
          )}

          {liveSessions.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                  {t("aiPanel.liveSessions")}
                </div>
                <span className="text-[10px] text-muted-foreground/50">
                  {format("aiPanel.activeCount", { count: liveSessions.length })}
                </span>
              </div>

              <div className="space-y-2">
                {liveSessions.map((session) => {
                  const isSelected = selectedLiveSessionId === session.id;
                  const isCurrentPage = session.pagePath === targetPath;
                  const agentLabel =
                    session.agentSlug === "editor" ? t("aiPanel.agent.editor") : startCase(session.agentSlug);

                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedLiveSessionId(session.id)}
                      className={cn(
                        "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                        isSelected
                          ? "border-primary/40 bg-primary/8"
                          : "border-border/60 hover:bg-accent/30"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {session.kind === "pending" ? (
                          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
                        ) : (
                          <Loader2 className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin text-emerald-500" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-[12px] font-medium text-foreground">
                              {session.userMessage}
                            </span>
                            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                              {agentLabel}
                            </span>
                            {isCurrentPage ? (
                              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
                                {t("aiPanel.here")}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="truncate">{session.pagePath}</span>
                            <span className="shrink-0">
                              {session.kind === "pending" && session.status === "failed"
                                    ? t("aiPanel.status.failed")
                                : session.kind === "pending"
                                      ? t("aiPanel.status.starting")
                                      : t("aiPanel.status.streaming")}
                            </span>
                          </div>
                        </div>
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            dismissLiveSession(session);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              event.stopPropagation();
                              dismissLiveSession(session);
                            }
                          }}
                          className="shrink-0 p-1 text-muted-foreground/40 transition-colors hover:text-destructive"
                          title={t("aiPanel.dismiss")}
                        >
                          <X className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedLiveSession && (
                <div className="space-y-3 rounded-xl border border-border/70 bg-card/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-accent/50 px-4 py-3 text-[13px] leading-relaxed flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin text-primary" />
                        {selectedLiveSession.kind === "pending"
                          ? selectedLiveSession.status === "failed"
                                ? t("aiPanel.pendingFailed")
                                : t("aiPanel.pendingStarting")
                              : t("aiPanel.liveStream")}
                      </div>
                      <div className="mt-1.5 text-foreground">
                        {selectedLiveSession.userMessage}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span>{selectedLiveSession.pagePath}</span>
                        <span>
                          {selectedLiveSession.agentSlug === "editor"
                            ? "Editor"
                            : startCase(selectedLiveSession.agentSlug)}
                        </span>
                        <span>{formatDate(selectedLiveSession.timestamp)} {formatTime(selectedLiveSession.timestamp)}</span>
                      </div>
                      {selectedLiveSession.kind === "running" && (selectedLiveSession.providerId || selectedLiveSession.adapterType) ? (
                        <ConversationRuntimeBadge
                          meta={{
                            providerId: selectedLiveSession.providerId,
                            adapterType: selectedLiveSession.adapterType,
                            adapterConfig: undefined,
                          }}
                          className="mt-2"
                        />
                      ) : null}
                    </div>
                    {selectedLiveSession.pagePath !== targetPath ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 text-[11px]"
                        onClick={() => {
                          useAppStore.getState().setSection({ type: "page" });
                          useTreeStore.getState().selectPage(selectedLiveSession.pagePath);
                          void loadPage(selectedLiveSession.pagePath);
                        }}
                      >
                        {t("aiPanel.openPage")}
                      </Button>
                    ) : null}
                  </div>

                  {selectedLiveSession.kind === "pending" ? (
                    <div className="min-h-[220px] rounded-lg border border-dashed border-border/70 bg-background/80 p-5">
                      <div className="flex h-full min-h-[188px] flex-col items-center justify-center gap-3 text-center">
                        {selectedLiveSession.status === "failed" ? (
                          <>
                            <X className="h-8 w-8 text-destructive" />
                            <div className="space-y-1">
                              <p className="text-[13px] font-medium text-foreground">
                                    {t("aiPanel.pendingFailedTitle")}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                    {selectedLiveSession.error || t("aiPanel.pendingFailedHint")}
                              </p>
                            </div>
                          </>
                        ) : (
                          <>
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="space-y-1">
                              <p className="text-[13px] font-medium text-foreground">
                                    {t("aiPanel.pendingStartingTitle")}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                    {t("aiPanel.pendingStartingHint")}
                              </p>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[260px] overflow-hidden rounded-lg border border-border/70 bg-background">
                      {selectedLiveSession.conversationId ? (
                        <ConversationSessionView
                          conversation={{
                            id: selectedLiveSession.conversationId,
                            cabinetPath: selectedLiveSession.cabinetPath,
                            status: "running",
                          }}
                          onOpenArtifact={() => {}}
                          density="compact"
                        />
                      ) : (
                        <WebTerminal
                          sessionId={selectedLiveSession.sessionId}
                          prompt={selectedLiveSession.prompt}
                          displayPrompt={selectedLiveSession.userMessage}
                          reconnect={selectedLiveSession.reconnect}
                          themeSurface="page"
                          onClose={() => handleSessionEnd(selectedLiveSession.sessionId)}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Past sessions for current page */}
          {pastSessions.length > 0 && (
            <div className="space-y-3">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                Previous Sessions
              </div>
              <div className="space-y-2">
                {historyConversations.map((conversation) => {
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
                      onClick={() => toggleHistorySelection(conversation.id)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border border-border/70 bg-background/40 px-4 py-3 text-left transition-colors",
                        selected
                          ? "bg-accent/40 text-foreground"
                          : "hover:bg-accent/30"
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {conversation.status === "completed" ? (
                          <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        ) : (
                          <X className="h-3.5 w-3.5 text-destructive" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-[12px] font-medium text-foreground">
                            {conversation.title}
                          </span>
                          {selected ? (
                            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-primary">
                              Open
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>
                            {formatDate(conversation.startedAt)} {formatTime(conversation.startedAt)}
                          </span>
                          {duration !== null ? <span>{duration}s</span> : null}
                          <span className="capitalize">{conversation.status}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedHistoryMeta ? (
                <div className="min-h-[220px] overflow-hidden rounded-lg border border-border/70 bg-background">
                  <ConversationSessionView
                    conversation={selectedHistoryMeta}
                    onOpenArtifact={() => {}}
                    density="compact"
                  />
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Non-selected running sessions stay mounted in the background so their streams stay alive */}
      {runningSessions
        .filter((session) =>
          selectedLiveSession?.kind === "running"
            ? session.sessionId !== selectedLiveSession.sessionId
            : true
        )
        .map((session) => (
          <div
            key={`hidden-${session.sessionId}`}
            data-terminal-keepalive="editor-session"
            style={{ width: 0, height: 0, overflow: "hidden", position: "absolute" }}
          >
            <WebTerminal
              sessionId={session.sessionId}
              prompt={session.prompt}
              displayPrompt={session.userMessage}
              reconnect={session.reconnect}
              preserveConnectionOnly={true}
              themeSurface="page"
              onClose={() => handleSessionEnd(session.sessionId)}
            />
          </div>
        ))}

      {/* Input */}
      <div className="border-t border-border shrink-0 px-5 py-4">
        <ComposerInput
          composer={composer}
          placeholder={
            targetPath
              ? t("aiPanel.inputPlaceholder")
              : t("aiPanel.selectPagePlaceholder")
          }
          disabled={!targetPath}
          variant="inline"
          secondaryAction={{
            label: t("aiPanel.generateImage"),
            onClick: () => void handleImageGeneration(),
            loading: imageSubmitting,
            disabled: !targetPath,
          }}
          minHeight="56px"
          maxHeight="160px"
          items={mentionItems}
          autoFocus={isOpen}
        />
      </div>
    </div>
  );
}
