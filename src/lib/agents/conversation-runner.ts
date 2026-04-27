import type { JobConfig, JobRun, JobPostAction } from "@/types/jobs";
import type { ConversationMeta } from "@/types/conversations";
import fs from "fs/promises";
import path from "path";
import { readPage } from "../storage/page-io";
import { DATA_DIR, resolveContentPath, sanitizeFilename } from "../storage/path-utils";
import { fileExists } from "../storage/fs-operations";
import {
  defaultAdapterTypeForProvider,
  resolveExecutionProviderId,
} from "./adapters";
import {
  appendConversationTranscript,
  createConversation,
  finalizeConversation,
  readConversationMeta,
} from "./conversation-store";
import { createDaemonSession, getDaemonSessionOutput } from "./daemon-client";
import { readLibraryPersona } from "./library-manager";
import { readPersona, type AgentPersona } from "./persona-manager";
import { getDefaultProviderId } from "./provider-runtime";
import { allowDangerousCliFlags } from "./execution-policy";
import { resolveScopedWorkdir } from "./workdir-policy";

export interface ConversationCompletion {
  meta: ConversationMeta;
  output: string;
  status: "completed" | "failed";
}

interface StartConversationInput {
  agentSlug: string;
  title: string;
  trigger: ConversationMeta["trigger"];
  prompt: string;
  providerId?: string;
  adapterType?: string;
  adapterConfig?: Record<string, unknown>;
  mentionedPaths?: string[];
  jobId?: string;
  jobName?: string;
  cabinetPath?: string;
  cwd?: string;
  timeoutSeconds?: number;
  onComplete?: (completion: ConversationCompletion) => Promise<void> | void;
}

function buildCabinetEpilogueInstructions(): string {
  return [
    "At the end of your response, include a ```cabinet block with these fields:",
    "SUMMARY: one short summary line",
    "CONTEXT: optional lightweight memory/context summary",
    "ARTIFACT: relative/path/to/file for every KB file you created or updated",
  ].join("\n");
}

function buildKnowledgeBaseScopeInstructions(
  baseCwd: string,
  cabinetPath?: string
): string[] {
  if (cabinetPath) {
    return [
      `Work only inside the cabinet-scoped knowledge base rooted at /data/${cabinetPath}.`,
      `For local filesystem work, treat ${baseCwd} as the root for this run.`,
      "Do not create or modify files in sibling cabinets or the global /data root unless the user explicitly asks.",
    ];
  }

  return [
    "Work in the Cabinet knowledge base rooted at /data.",
    `For local filesystem work, treat ${baseCwd} as the root for this run.`,
  ];
}

function buildDiagramOutputInstructions(): string[] {
  return [
    "If you create Mermaid diagrams, make sure the source is renderable.",
    "Prefer Mermaid edge labels like `A -->|label| B` or `A -.->|label| B` instead of mixed forms such as `A -- \"label\" --> B`.",
  ];
}

function buildAgentContextHeader(persona: AgentPersona | null, agentSlug: string): string {
  if (!persona) {
    return [
      "You are Cabinet's General agent.",
      "Handle the request directly and use the knowledge base as your working area.",
    ].join("\n");
  }

  return [
    persona.body,
    "",
    `You are working as ${persona.name} (${agentSlug}).`,
  ].join("\n");
}

function makeTitle(text: string): string {
  const firstLine = text.split("\n").map((line) => line.trim()).find(Boolean) || "New conversation";
  return firstLine.slice(0, 80);
}

const TEXT_CONTEXT_EXTENSIONS = new Set([
  ".css",
  ".csv",
  ".htm",
  ".html",
  ".js",
  ".json",
  ".jsonc",
  ".jsx",
  ".md",
  ".mdx",
  ".mjs",
  ".cjs",
  ".mmd",
  ".mermaid",
  ".scss",
  ".svg",
  ".ts",
  ".tsx",
  ".txt",
  ".xml",
  ".yaml",
  ".yml",
]);

const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".png",
  ".webp",
]);

const TEXT_CONTEXT_LIMIT = 24_000;

function normalizeVirtualPath(virtualPath: string): string {
  return virtualPath.trim().replace(/^\/+|\/+$/g, "");
}

function appendVirtualPath(basePath: string, filename: string): string {
  const normalized = normalizeVirtualPath(basePath);
  return normalized ? `${normalized}/${filename}` : filename;
}

function extensionLabel(ext: string): string {
  return ext.replace(/^\./, "").toUpperCase() || "file";
}

function classifyTextTarget(ext: string): string {
  switch (ext) {
    case ".csv":
      return "CSV data file";
    case ".html":
    case ".htm":
      return "HTML file";
    case ".svg":
      return "SVG image";
    case ".md":
    case ".mdx":
      return "Markdown page";
    case ".mermaid":
    case ".mmd":
      return "Mermaid diagram";
    default:
      return `${extensionLabel(ext)} text file`;
  }
}

function truncateTextContext(text: string): string {
  if (text.length <= TEXT_CONTEXT_LIMIT) return text;
  return `${text.slice(0, TEXT_CONTEXT_LIMIT)}\n\n[Content truncated after ${TEXT_CONTEXT_LIMIT} characters.]`;
}

async function readTextContext(virtualPath: string): Promise<string> {
  const raw = await fs.readFile(resolveContentPath(virtualPath), "utf8");
  return truncateTextContext(raw.trimEnd());
}

interface EditableTargetContext {
  virtualPath: string;
  targetType: string;
  summaryLines: string[];
  content?: string;
  fenceLanguage?: string;
}

function fenceLanguageForExtension(ext: string): string {
  switch (ext) {
    case ".csv":
      return "csv";
    case ".html":
    case ".htm":
      return "html";
    case ".json":
    case ".jsonc":
      return "json";
    case ".md":
    case ".mdx":
      return "markdown";
    case ".svg":
    case ".xml":
      return "xml";
    case ".yaml":
    case ".yml":
      return "yaml";
    case ".css":
      return "css";
    case ".js":
    case ".mjs":
    case ".cjs":
    case ".jsx":
      return "javascript";
    case ".ts":
    case ".tsx":
      return "typescript";
    default:
      return "";
  }
}

async function buildEditableTargetContext(pagePath: string): Promise<EditableTargetContext> {
  const normalizedPath = normalizeVirtualPath(pagePath);
  const resolved = resolveContentPath(normalizedPath);
  const stat = await fs.stat(resolved).catch(() => null);

  if (stat?.isDirectory()) {
    const indexMdPath = appendVirtualPath(normalizedPath, "index.md");
    const indexHtmlPath = appendVirtualPath(normalizedPath, "index.html");
    const hasIndexMd = await fileExists(resolveContentPath(indexMdPath));
    const hasIndexHtml = await fileExists(resolveContentPath(indexHtmlPath));

    if (hasIndexMd) {
      const page = await readPage(normalizedPath);
      return {
        virtualPath: indexMdPath,
        targetType: "Markdown directory page",
        summaryLines: [
          `Cabinet selected path: ${normalizedPath}`,
          "This directory uses index.md as its editable page body.",
        ],
        content: truncateTextContext(page.content),
        fenceLanguage: "markdown",
      };
    }

    if (hasIndexHtml) {
      return {
        virtualPath: indexHtmlPath,
        targetType: "HTML embedded website",
        summaryLines: [
          `Cabinet selected path: ${normalizedPath}`,
          "This directory renders as an embedded website. Edit index.html and sibling assets in this directory when the request changes the visible page.",
        ],
        content: await readTextContext(indexHtmlPath),
        fenceLanguage: "html",
      };
    }

    return {
      virtualPath: normalizedPath,
      targetType: "Directory",
      summaryLines: [
        "This is a directory without index.md or index.html. Inspect its child files before deciding what to edit.",
      ],
    };
  }

  const ext = path.extname(normalizedPath).toLowerCase();

  if (TEXT_CONTEXT_EXTENSIONS.has(ext)) {
    return {
      virtualPath: normalizedPath,
      targetType: classifyTextTarget(ext),
      summaryLines: [
        "This is the currently selected editable file. Preserve its file format and syntax.",
      ],
      content: await readTextContext(normalizedPath),
      fenceLanguage: fenceLanguageForExtension(ext),
    };
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return {
      virtualPath: normalizedPath,
      targetType: `${extensionLabel(ext)} image`,
      summaryLines: [
        "This is a binary image target. If the user asks to change the image itself, edit or regenerate the binary image file in place at this path.",
        "Do not answer only with a description when a concrete image edit was requested.",
      ],
    };
  }

  return {
    virtualPath: normalizedPath,
    targetType: `${extensionLabel(ext)} file`,
    summaryLines: [
      "This is the currently selected file. Inspect it and edit it directly only when the file format supports the requested change.",
    ],
  };
}

function formatEditableTargetContext(context: EditableTargetContext): string {
  const lines = [
    `Primary editable target: ${context.virtualPath}`,
    `Target type: ${context.targetType}`,
    ...context.summaryLines,
  ];

  if (context.content !== undefined) {
    const language = context.fenceLanguage || "";
    lines.push("", "Current target content excerpt:", `\`\`\`${language}`, context.content, "```");
  }

  return lines.join("\n");
}

const IMAGE_REQUEST_PREFIX = /^\/(?:image|img)\b[:：]?\s*|^生成图片[:：]?\s*/i;

export function isImageGenerationRequest(text: string): boolean {
  return IMAGE_REQUEST_PREFIX.test(text.trim());
}

function stripImageGenerationPrefix(text: string): string {
  return text.trim().replace(IMAGE_REQUEST_PREFIX, "").trim();
}

function stripCabinetPrefix(pagePath: string, cabinetPath?: string): string {
  const normalizedPage = pagePath.replace(/^\/+|\/+$/g, "");
  const normalizedCabinet = cabinetPath?.replace(/^\/+|\/+$/g, "");
  if (!normalizedCabinet) return normalizedPage;
  if (normalizedPage === normalizedCabinet) return "";
  return normalizedPage.startsWith(`${normalizedCabinet}/`)
    ? normalizedPage.slice(normalizedCabinet.length + 1)
    : normalizedPage;
}

async function resolvePageAssetDir(pagePath: string, cabinetPath?: string): Promise<string> {
  const relativePagePath = stripCabinetPrefix(pagePath, cabinetPath);
  const resolvedPagePath = resolveContentPath(pagePath);
  const resolvedDirectoryPage = await fileExists(path.join(resolvedPagePath, "index.md"));
  const pageDir = resolvedDirectoryPage
    ? relativePagePath
    : path.dirname(relativePagePath);
  const normalizedPageDir = pageDir === "." ? "" : pageDir;
  return normalizedPageDir
    ? `${normalizedPageDir}/generated-images`
    : "generated-images";
}

export async function buildImageGenerationConversationPrompt(input: {
  pagePath: string;
  userMessage: string;
  mentionedPaths?: string[];
  readableMentionedPaths?: string[];
  cabinetPath?: string;
}): Promise<{
  prompt: string;
  title: string;
  cwd?: string;
  mentionedPaths: string[];
  adapterType: string;
  adapterConfig?: Record<string, unknown>;
  providerId: string;
  cabinetPath?: string;
}> {
  const cleanRequest = stripImageGenerationPrefix(input.userMessage) || input.userMessage.trim();
  const combinedMentionedPaths = Array.from(
    new Set([input.pagePath, ...(input.mentionedPaths || [])])
  );
  const mentionContext = await buildMentionContext(
    combinedMentionedPaths,
    input.readableMentionedPaths ? new Set(input.readableMentionedPaths) : undefined,
  );
  const baseCwd = resolveScopedWorkdir({ cabinetPath: input.cabinetPath });
  const outputDir = await resolvePageAssetDir(input.pagePath, input.cabinetPath);
  const filenameBase = sanitizeFilename(cleanRequest).slice(0, 48) || "generated-image";
  const outputPath = `${outputDir}/${filenameBase}.png`;

  const prompt = [
    "You are Cabinet's image generation worker.",
    "",
    ...buildKnowledgeBaseScopeInstructions(baseCwd, input.cabinetPath),
    "Use Codex CLI's image generation capability. Prefer GPT Image 2 when the local Codex CLI exposes it; otherwise use the best available GPT Image generation model.",
    "Generate a real bitmap image file. Do not substitute SVG, HTML, CSS, Mermaid, or a text-only description unless the user explicitly asks for that format.",
    `Save the final PNG under this path relative to the active cabinet root: ${outputPath}`,
    "If you create intermediate files, keep only the final useful image unless the user asks for variants.",
    "After saving the image, update the current page only when it is useful by inserting a Markdown image reference to the generated file.",
    buildCabinetEpilogueInstructions(),
    `ARTIFACT: ${outputPath}`,
    "",
    `Current page: /data/${input.pagePath}`,
    `Image request:\n${cleanRequest}${mentionContext}`,
  ].join("\n");

  return {
    prompt,
    title: makeTitle(cleanRequest),
    cwd: baseCwd,
    mentionedPaths: combinedMentionedPaths,
    adapterType: "codex_local",
    adapterConfig: { imageGenerationModel: "gpt-image-2" },
    providerId: "codex-cli",
    cabinetPath: input.cabinetPath,
  };
}

async function buildMentionContext(
  mentionedPaths: string[],
  readablePaths?: Set<string>,
): Promise<string> {
  if (mentionedPaths.length === 0) return "";

  const chunks = await Promise.all(
    mentionedPaths.map(async (pagePath) => {
      if (readablePaths && !readablePaths.has(pagePath)) return null;

      try {
        const context = await buildEditableTargetContext(pagePath);
        const body = context.content
          ? context.content
          : context.summaryLines.join("\n");
        return `--- ${context.targetType} (${context.virtualPath}) ---\n${body}`;
      } catch {
        return null;
      }
    })
  );

  const valid = chunks.filter(Boolean);
  if (valid.length === 0) return "";

  return `\n\nReferenced pages:\n${valid.join("\n\n")}`;
}

export async function buildManualConversationPrompt(input: {
  agentSlug: string;
  userMessage: string;
  mentionedPaths?: string[];
  readableMentionedPaths?: string[];
  cabinetPath?: string;
}): Promise<{
  prompt: string;
  title: string;
  cwd?: string;
  adapterType: string;
  adapterConfig?: Record<string, unknown>;
  providerId: string;
  cabinetPath?: string;
}> {
  const persona = input.agentSlug === "general"
    ? null
    : await readPersona(input.agentSlug, input.cabinetPath);
  const mentionContext = await buildMentionContext(
    input.mentionedPaths || [],
    input.readableMentionedPaths ? new Set(input.readableMentionedPaths) : undefined,
  );
  const baseCwd = resolveScopedWorkdir({ cabinetPath: input.cabinetPath });
  const cwd = resolveScopedWorkdir({
    cabinetPath: input.cabinetPath,
    workdir: persona?.workdir,
  });

  const prompt = [
    buildAgentContextHeader(persona, input.agentSlug),
    "",
    ...buildKnowledgeBaseScopeInstructions(baseCwd, input.cabinetPath),
    "Reflect useful outputs in KB files, not only in terminal text.",
    ...buildDiagramOutputInstructions(),
    buildCabinetEpilogueInstructions(),
    "",
    `User request:\n${input.userMessage}${mentionContext}`,
  ].join("\n");

  const defaultProviderId = getDefaultProviderId();

  return {
    prompt,
    title: makeTitle(input.userMessage),
    cwd,
    adapterType:
      persona?.adapterType ||
      defaultAdapterTypeForProvider(
        resolveExecutionProviderId({
          adapterType: persona?.adapterType,
          providerId: persona?.provider,
          defaultProviderId,
        })
      ),
    adapterConfig: persona?.adapterConfig,
    providerId: resolveExecutionProviderId({
      adapterType: persona?.adapterType,
      providerId: persona?.provider,
      defaultProviderId,
    }),
    cabinetPath: input.cabinetPath,
  };
}

export async function buildEditorConversationPrompt(input: {
  pagePath: string;
  userMessage: string;
  mentionedPaths?: string[];
  readableMentionedPaths?: string[];
  cabinetPath?: string;
}): Promise<{
  prompt: string;
  title: string;
  cwd?: string;
  mentionedPaths: string[];
  adapterType: string;
  adapterConfig?: Record<string, unknown>;
  providerId: string;
}> {
  const persona =
    (await readPersona("editor", input.cabinetPath)) ||
    (await readPersona("editor")) ||
    (await readLibraryPersona("editor", input.cabinetPath));
  const combinedMentionedPaths = Array.from(
    new Set([input.pagePath, ...(input.mentionedPaths || [])])
  );
  const mentionContext = await buildMentionContext(
    combinedMentionedPaths,
    input.readableMentionedPaths ? new Set(input.readableMentionedPaths) : undefined,
  );
  const targetContext = await buildEditableTargetContext(input.pagePath);
  const baseCwd = resolveScopedWorkdir({ cabinetPath: input.cabinetPath });
  const cwd = resolveScopedWorkdir({
    cabinetPath: input.cabinetPath,
    workdir: persona?.workdir,
  });

  const prompt = [
    buildAgentContextHeader(persona, "editor"),
    "",
    `You are editing the page at /data/${input.pagePath}.`,
    formatEditableTargetContext(targetContext),
    `Prefer making the requested changes directly in ${targetContext.virtualPath} unless the task clearly belongs in another KB file.`,
    "Do not assume the target is markdown. Follow the actual file type and Cabinet structure when choosing what to edit.",
    ...buildKnowledgeBaseScopeInstructions(baseCwd, input.cabinetPath),
    "Edit KB files directly and reflect useful outputs in the KB, not only in terminal text.",
    ...buildDiagramOutputInstructions(),
    buildCabinetEpilogueInstructions(),
    "",
    `User request:\n${input.userMessage}${mentionContext}`,
  ].join("\n");

  const defaultProviderId = getDefaultProviderId();

  return {
    prompt,
    title: makeTitle(input.userMessage),
    cwd,
    mentionedPaths: combinedMentionedPaths,
    adapterType:
      persona?.adapterType ||
      defaultAdapterTypeForProvider(
        resolveExecutionProviderId({
          adapterType: persona?.adapterType,
          providerId: persona?.provider,
          defaultProviderId,
        })
      ),
    adapterConfig: persona?.adapterConfig,
    providerId: resolveExecutionProviderId({
      adapterType: persona?.adapterType,
      providerId: persona?.provider,
      defaultProviderId,
    }),
  };
}

export async function startConversationRun(
  input: StartConversationInput
): Promise<ConversationMeta> {
  const resolvedProviderId = input.providerId || getDefaultProviderId();
  const resolvedAdapterType =
    input.adapterType || defaultAdapterTypeForProvider(resolvedProviderId);

  const meta = await createConversation({
    agentSlug: input.agentSlug,
    cabinetPath: input.cabinetPath,
    title: input.title,
    trigger: input.trigger,
    prompt: input.prompt,
    providerId: resolvedProviderId,
    adapterType: resolvedAdapterType,
    adapterConfig: input.adapterConfig,
    mentionedPaths: input.mentionedPaths,
    jobId: input.jobId,
    jobName: input.jobName,
    runAudit: {
      requestedAt: new Date().toISOString(),
      providerId: resolvedProviderId,
      adapterType: resolvedAdapterType,
      cwd: input.cwd,
      cabinetPath: input.cabinetPath,
      jobId: input.jobId,
      jobName: input.jobName,
      dangerousCliFlagsAllowed: allowDangerousCliFlags(),
    },
  });

  try {
    await createDaemonSession({
      id: meta.id,
      prompt: input.prompt,
      providerId: resolvedProviderId,
      adapterType: resolvedAdapterType,
      adapterConfig: input.adapterConfig,
      cwd: input.cwd,
      timeoutSeconds: input.timeoutSeconds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start daemon session";
    await appendConversationTranscript(meta.id, `${message}\n`);
    await finalizeConversation(meta.id, {
      status: "failed",
      output: message,
      exitCode: 1,
    });
    throw error;
  }

  if (input.onComplete) {
    void waitForConversationCompletion(meta.id, input.onComplete);
  }

  return meta;
}

export async function waitForConversationCompletion(
  conversationId: string,
  onComplete?: (completion: ConversationCompletion) => Promise<void> | void
): Promise<ConversationCompletion> {
  const deadline = Date.now() + 15 * 60 * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    try {
      const data = await getDaemonSessionOutput(conversationId);
      if (data.status === "running") {
        continue;
      }

      const normalizedStatus = data.status === "completed" ? "completed" : "failed";
      const currentMeta = await readConversationMeta(conversationId);
      const finalMeta =
        currentMeta?.status === "running"
          ? await finalizeConversation(conversationId, {
              status: normalizedStatus,
              output: data.output,
              exitCode: normalizedStatus === "completed" ? 0 : 1,
            })
          : currentMeta;

      if (!finalMeta) {
        throw new Error(`Conversation ${conversationId} disappeared during completion`);
      }

      const completion = {
        meta: finalMeta,
        output: data.output,
        status: normalizedStatus,
      } satisfies ConversationCompletion;

      if (onComplete) {
        await onComplete(completion);
      }

      return completion;
    } catch {
      // Retry until timeout. The daemon can briefly 404 while cleaning up.
    }
  }

  const finalMeta = await finalizeConversation(conversationId, {
    status: "failed",
    output: "Conversation timed out while waiting for completion.",
    exitCode: 124,
  });

  if (!finalMeta) {
    throw new Error(`Conversation ${conversationId} timed out and no metadata was found`);
  }

  const completion = {
    meta: finalMeta,
    output: "Conversation timed out while waiting for completion.",
    status: "failed",
  } satisfies ConversationCompletion;

  if (onComplete) {
    await onComplete(completion);
  }

  return completion;
}

function substituteTemplateVars(text: string, job: JobConfig): string {
  const now = new Date();
  return text
    .replace(/\{\{date\}\}/g, now.toISOString().split("T")[0])
    .replace(/\{\{datetime\}\}/g, now.toISOString())
    .replace(/\{\{job\.name\}\}/g, job.name)
    .replace(/\{\{job\.id\}\}/g, job.id)
    .replace(/\{\{job\.workdir\}\}/g, job.workdir || "/data");
}

async function processPostActions(
  actions: JobPostAction[] | undefined,
  job: JobConfig
): Promise<void> {
  if (!actions || actions.length === 0) return;

  for (const action of actions) {
    try {
      if (action.action === "git_commit") {
        const simpleGit = (await import("simple-git")).default;
        const git = simpleGit(DATA_DIR);
        await git.add(".");
        await git.commit(
          substituteTemplateVars(
            action.message || `Job ${job.name} completed {{date}}`,
            job
          )
        );
      }
    } catch (error) {
      console.error(`Post-action ${action.action} failed:`, error);
    }
  }
}

export async function startJobConversation(job: JobConfig): Promise<JobRun> {
  const persona = job.agentSlug ? await readPersona(job.agentSlug, job.cabinetPath) : null;
  const defaultProviderId = getDefaultProviderId();
  const jobPrompt = substituteTemplateVars(job.prompt, job);
  const baseCwd = resolveScopedWorkdir({ cabinetPath: job.cabinetPath });
  const cwd = resolveScopedWorkdir({
    cabinetPath: job.cabinetPath,
    workdir: job.workdir || persona?.workdir,
  });

  const prompt = [
    buildAgentContextHeader(persona, job.agentSlug || "agent"),
    "",
    "This is a scheduled or manual Cabinet job.",
    ...buildKnowledgeBaseScopeInstructions(baseCwd, job.cabinetPath),
    "Reflect the results in KB files whenever useful.",
    ...buildDiagramOutputInstructions(),
    buildCabinetEpilogueInstructions(),
    "",
    `Job instructions:\n${jobPrompt}`,
  ].join("\n");

  const meta = await startConversationRun({
    agentSlug: job.agentSlug || "agent",
    title: job.name,
    trigger: "job",
    prompt,
    adapterType:
      job.adapterType ||
      persona?.adapterType ||
      defaultAdapterTypeForProvider(
        resolveExecutionProviderId({
          adapterType: job.adapterType || persona?.adapterType,
          providerId: job.provider || persona?.provider,
          defaultProviderId,
        })
      ),
    adapterConfig: job.adapterConfig || persona?.adapterConfig,
    providerId: resolveExecutionProviderId({
      adapterType: job.adapterType || persona?.adapterType,
      providerId: job.provider || persona?.provider,
      defaultProviderId,
    }),
    jobId: job.id,
    jobName: job.name,
    cabinetPath: job.cabinetPath,
    cwd,
    timeoutSeconds: job.timeout || 600,
    onComplete: async (completion) => {
      if (completion.status === "completed") {
        await processPostActions(job.on_complete, job);
      } else {
        await processPostActions(job.on_failure, job);
      }
    },
  });

  return {
    id: meta.id,
    jobId: job.id,
    status: "running",
    startedAt: meta.startedAt,
    output: "",
  };
}
