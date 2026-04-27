"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { ConversationLiveView } from "@/components/agents/conversation-live-view";
import { ConversationResultView } from "@/components/agents/conversation-result-view";
import type { ConversationDetail, ConversationMeta } from "@/types/conversations";

type ConversationSessionTarget = Pick<
  ConversationMeta,
  "id" | "cabinetPath" | "status"
>;

type ConversationViewDensity = "default" | "compact";

export function ConversationSessionView({
  conversation,
  onOpenArtifact,
  onDetailChange,
  onMissingDetail,
  density = "default",
  loadingLabel = "Loading...",
  waitingLabel = "Waiting for conversation detail...",
  errorLabel = "Could not load conversation detail.",
}: {
  conversation: ConversationSessionTarget | null;
  onOpenArtifact: (path: string) => void;
  onDetailChange?: (detail: ConversationDetail | null) => void;
  onMissingDetail?: (reason: "not_found" | "error") => void;
  density?: ConversationViewDensity;
  loadingLabel?: string;
  waitingLabel?: string;
  errorLabel?: string;
}) {
  const [detail, setDetail] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [failedLoad, setFailedLoad] = useState(false);
  const missingDetailReasonRef = useRef<"not_found" | "error" | null>(null);
  const previousKeyRef = useRef<string | null>(null);
  const conversationId = conversation?.id || "";
  const conversationCabinetPath = conversation?.cabinetPath || "";
  const conversationStatus = conversation?.status || "";
  const reportMissingDetail = useCallback((reason: "not_found" | "error") => {
    if (missingDetailReasonRef.current === reason) return;
    missingDetailReasonRef.current = reason;
    onMissingDetail?.(reason);
  }, [onMissingDetail]);

  useEffect(() => {
    if (!conversationId) {
      previousKeyRef.current = null;
      missingDetailReasonRef.current = null;
      setDetail(null);
      setLoading(false);
      setFailedLoad(false);
      onDetailChange?.(null);
      return;
    }

    const selectedConversation = {
      id: conversationId,
      cabinetPath: conversationCabinetPath || undefined,
      status: conversationStatus,
    };
    const selectionKey = `${selectedConversation.id}::${selectedConversation.cabinetPath || ""}`;
    const isNewSelection = previousKeyRef.current !== selectionKey;
    previousKeyRef.current = selectionKey;

    if (isNewSelection) {
      missingDetailReasonRef.current = null;
      setDetail(null);
      onDetailChange?.(null);
    }
    setFailedLoad(false);

    let cancelled = false;
    let pollHandle: number | null = null;

    async function loadConversationDetail(background = false): Promise<ConversationDetail | null> {
      if (!background) {
        setLoading(true);
      }

      const params = new URLSearchParams();
      if (selectedConversation.cabinetPath) {
        params.set("cabinetPath", selectedConversation.cabinetPath);
      }

      try {
        const response = await fetch(
          `/api/agents/conversations/${selectedConversation.id}?${params.toString()}`
        );
        const data = response.ok ? ((await response.json()) as ConversationDetail) : null;
        if (!cancelled && data) {
          missingDetailReasonRef.current = null;
          setDetail(data);
          setFailedLoad(false);
          onDetailChange?.(data);
          if (data.meta.status !== "running" && pollHandle !== null) {
            window.clearInterval(pollHandle);
            pollHandle = null;
          }
          return data;
        }
        if (!cancelled && !data) {
          setFailedLoad(true);
          reportMissingDetail(response.status === 404 ? "not_found" : "error");
        }
      } catch {
        if (!cancelled) {
          setFailedLoad(true);
          reportMissingDetail("error");
        }
      } finally {
        if (!cancelled && !background) {
          setLoading(false);
        }
      }

      return null;
    }

    void (async () => {
      const nextDetail = await loadConversationDetail();
      const shouldPoll =
        (nextDetail?.meta.status || selectedConversation.status) === "running";
      if (!cancelled && shouldPoll && pollHandle === null) {
        pollHandle = window.setInterval(() => {
          void loadConversationDetail(true);
        }, 1500);
      }
    })();

    return () => {
      cancelled = true;
      if (pollHandle !== null) {
        window.clearInterval(pollHandle);
      }
    };
  }, [
    conversationCabinetPath,
    conversationId,
    conversationStatus,
    onDetailChange,
    reportMissingDetail,
  ]);

  if (loading && !detail) {
    return (
      <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {loadingLabel}
      </div>
    );
  }

  if (detail) {
    if (detail.meta.status === "running") {
      return (
        <ConversationLiveView
          detail={detail}
          onOpenArtifact={onOpenArtifact}
          density={density}
        />
      );
    }

    return (
      <ConversationResultView
        detail={detail}
        onOpenArtifact={onOpenArtifact}
        density={density}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      {failedLoad ? errorLabel : waitingLabel}
    </div>
  );
}
