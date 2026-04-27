import { NextRequest, NextResponse } from "next/server";
import { defaultAdapterTypeForProvider } from "@/lib/agents/adapters";
import {
  buildEditorConversationPrompt,
  buildImageGenerationConversationPrompt,
  buildManualConversationPrompt,
  isImageGenerationRequest,
  startConversationRun,
} from "@/lib/agents/conversation-runner";
import { buildConversationInstanceKey } from "@/lib/agents/conversation-identity";
import { listConversationMetas } from "@/lib/agents/conversation-store";
import { readMemory, writeMemory } from "@/lib/agents/persona-manager";
import { readCabinetOverview, resolveOverviewCabinetPath } from "@/lib/cabinets/overview";
import { findOwningCabinetPathForPage } from "@/lib/cabinets/server-paths";
import { canReadCabinetForRequest, requirePageAction } from "@/lib/auth/route-guards";
import type { CabinetVisibilityMode } from "@/types/cabinets";
import type { ConversationMeta } from "@/types/conversations";

async function filterReadableConversationMetas(
  req: NextRequest,
  conversations: ConversationMeta[],
): Promise<ConversationMeta[]> {
  const filtered: ConversationMeta[] = [];
  const cache = new Map<string, Promise<boolean>>();

  for (const conversation of conversations) {
    const cabinetPath = conversation.cabinetPath || ".";
    const allowed = cache.get(cabinetPath) ??
      canReadCabinetForRequest(req, cabinetPath).catch(() => false);
    cache.set(cabinetPath, allowed);
    if (await allowed) {
      filtered.push(conversation);
    }
  }

  return filtered;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const agentSlug = searchParams.get("agent") || undefined;
  const pagePath = searchParams.get("pagePath") || undefined;
  const trigger = searchParams.get("trigger") as
    | "manual"
    | "job"
    | "heartbeat"
    | null;
  const status = searchParams.get("status") as
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | null;
  const cabinetPath = searchParams.get("cabinetPath") || undefined;
  const conversationId = searchParams.get("conversationId") || undefined;
  const visibilityMode = (searchParams.get("visibilityMode") || "own") as CabinetVisibilityMode;
  const limit = parseInt(searchParams.get("limit") || "200", 10);

  const filtered = {
    agentSlug: agentSlug && agentSlug !== "all" ? agentSlug : undefined,
    pagePath: pagePath || undefined,
    trigger: trigger || undefined,
    status: status || undefined,
    limit: 1000,
  };

  if (conversationId) {
    const conversations = await listConversationMetas({
      ...filtered,
      cabinetPath,
      limit: 1000,
    });
    const readableConversations = await filterReadableConversationMetas(req, conversations);
    const conversation = readableConversations.find((entry) => entry.id === conversationId) || null;
    return NextResponse.json({ conversation });
  }

  // When viewing a cabinet with visibility that includes descendants, aggregate
  // conversations from all visible cabinet directories.
  if (cabinetPath && visibilityMode !== "own") {
    try {
      const overview = await readCabinetOverview(cabinetPath, { visibilityMode });
      const visiblePaths = [];
      for (const cabinet of overview.visibleCabinets) {
        if (await canReadCabinetForRequest(req, resolveOverviewCabinetPath(cabinet.path)).catch(() => false)) {
          visiblePaths.push(cabinet.path);
        }
      }

      const all = await Promise.all(
        visiblePaths.map((cp) => listConversationMetas({ ...filtered, cabinetPath: cp }))
      );

      const deduped = new Map<string, (typeof all)[number][number]>();
      for (const conversation of all.flat()) {
        const key = buildConversationInstanceKey(conversation);
        if (!deduped.has(key)) {
          deduped.set(key, conversation);
        }
      }

      const merged = Array.from(deduped.values());
      merged.sort(
        (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

      return NextResponse.json({
        conversations: (await filterReadableConversationMetas(req, merged)).slice(0, limit),
      });
    } catch {
      // Fall through to single-cabinet fetch on error
    }
  }

  const conversations = await listConversationMetas({
    ...filtered,
    cabinetPath,
    limit,
  });

  return NextResponse.json({
    conversations: await filterReadableConversationMetas(req, conversations),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const source = body.source === "editor" ? "editor" : "manual";
    const agentSlug = source === "editor" ? "editor" : body.agentSlug || "general";
    const userMessage = (body.userMessage || "").trim();
    const mentionedPaths = Array.isArray(body.mentionedPaths)
      ? body.mentionedPaths
          .filter((value: unknown): value is string => typeof value === "string")
          .map((value: string) => value.trim().replace(/^\/+|\/+$/g, ""))
          .filter(Boolean)
      : [];
    const pagePath =
      typeof body.pagePath === "string" && body.pagePath.trim()
        ? body.pagePath.trim().replace(/^\/+|\/+$/g, "")
        : undefined;
    const cabinetPath =
      typeof body.cabinetPath === "string" && body.cabinetPath.trim()
        ? body.cabinetPath.trim()
        : undefined;
    const requestedProviderId =
      typeof body.providerId === "string" && body.providerId.trim()
        ? body.providerId.trim()
        : undefined;
    const requestedAdapterType =
      typeof body.adapterType === "string" && body.adapterType.trim()
        ? body.adapterType.trim()
        : undefined;
    const requestedModel =
      typeof body.model === "string" && body.model.trim()
        ? body.model.trim()
        : undefined;
    const requestedEffort =
      typeof body.effort === "string" && body.effort.trim()
        ? body.effort.trim()
        : undefined;
    const wantsImageGeneration =
      body.intent === "image_generation" || isImageGenerationRequest(userMessage);

    if (!userMessage) {
      return NextResponse.json(
        { error: "userMessage is required" },
        { status: 400 }
      );
    }

    if (source === "editor" && !pagePath) {
      return NextResponse.json(
        { error: "pagePath is required for editor conversations" },
        { status: 400 }
      );
    }

    const readableMentionedPaths = Array.from(
      new Set([
        ...(source === "editor" && pagePath ? [pagePath] : []),
        ...mentionedPaths,
      ])
    );
    for (const readablePath of readableMentionedPaths) {
      const forbidden = await requirePageAction(req, readablePath, "read_raw");
      if (forbidden) return forbidden;
    }

    const editorCabinetPath =
      source === "editor" && pagePath
        ? await findOwningCabinetPathForPage(pagePath)
        : undefined;

    const conversationInput = wantsImageGeneration && pagePath
      ? await buildImageGenerationConversationPrompt({
          pagePath,
          userMessage,
          mentionedPaths,
          readableMentionedPaths,
          cabinetPath: editorCabinetPath || cabinetPath,
        })
      : source === "editor" && pagePath
        ? await buildEditorConversationPrompt({
            pagePath,
            userMessage,
            mentionedPaths,
            readableMentionedPaths,
            cabinetPath: editorCabinetPath,
          })
        : await buildManualConversationPrompt({
            agentSlug,
            userMessage,
            mentionedPaths,
            readableMentionedPaths,
            cabinetPath,
          });

    const conversationCabinetPath =
      editorCabinetPath ??
      ("cabinetPath" in conversationInput ? conversationInput.cabinetPath : cabinetPath);
    const resolvedProviderId = requestedProviderId || conversationInput.providerId;
    const resolvedAdapterType =
      requestedAdapterType ||
      (requestedProviderId
        ? defaultAdapterTypeForProvider(requestedProviderId)
        : conversationInput.adapterType);
    const adapterConfigBase =
      requestedProviderId && requestedProviderId !== conversationInput.providerId
        ? {}
        : { ...(conversationInput.adapterConfig || {}) };
    if (requestedModel) {
      adapterConfigBase.model = requestedModel;
    }
    if (requestedEffort) {
      adapterConfigBase.effort = requestedEffort;
    }
    const resolvedAdapterConfig =
      Object.keys(adapterConfigBase).length > 0 ? adapterConfigBase : undefined;

    const conversation = await startConversationRun({
      agentSlug,
      title: conversationInput.title,
      trigger: "manual",
      prompt: conversationInput.prompt,
      adapterType: resolvedAdapterType,
      adapterConfig: resolvedAdapterConfig,
      providerId: resolvedProviderId,
      mentionedPaths:
        "mentionedPaths" in conversationInput
          ? conversationInput.mentionedPaths
          : mentionedPaths,
      cwd: conversationInput.cwd,
      cabinetPath: conversationCabinetPath,
      onComplete: async (completion) => {
        if (agentSlug === "general" || !completion.meta.contextSummary) return;
        const timestamp = new Date().toISOString();
        const completionCabinetPath = completion.meta.cabinetPath || conversationCabinetPath;
        const existingContext = await readMemory(
          agentSlug,
          "context.md",
          completionCabinetPath
        );
        const nextEntry = `\n\n## ${timestamp}\n${completion.meta.contextSummary}`;
        await writeMemory(
          agentSlug,
          "context.md",
          existingContext + nextEntry,
          completionCabinetPath
        );
      },
    });

    return NextResponse.json({ ok: true, conversation }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
