import { codexCliProvider } from "../providers/codex-cli";
import { resolveCliCommand } from "../provider-cli";
import { providerStatusToEnvironmentTest } from "./environment";
import {
  consumeCodexJsonStream,
  consumeCodexStderr,
  createCodexStderrAccumulator,
  createCodexStreamAccumulator,
  flushCodexJsonStream,
  flushCodexStderr,
} from "./codex-stream";
import type { AgentExecutionAdapter } from "./types";
import { ADAPTER_RUNTIME_PATH, runChildProcess } from "./utils";
import { dangerousCliArgs } from "../execution-policy";

function readStringConfig(
  config: Record<string, unknown>,
  key: string
): string | undefined {
  const value = config[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function firstNonEmptyLine(text: string): string | null {
  return (
    text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean) || null
  );
}

function buildCodexArgs(config: Record<string, unknown>): string[] {
  const args = [
    "exec",
    "--json",
    "--ephemeral",
    "--skip-git-repo-check",
    ...dangerousCliArgs(["--dangerously-bypass-approvals-and-sandbox"]),
  ];

  const model = readStringConfig(config, "model");
  if (model) {
    args.push("--model", model);
  }

  const profile = readStringConfig(config, "profile");
  if (profile) {
    args.push("--profile", profile);
  }

  const effort =
    readStringConfig(config, "effort") ||
    readStringConfig(config, "reasoningEffort");
  if (effort) {
    args.push("-c", `model_reasoning_effort="${effort}"`);
  }

  return args;
}

function filterCodexStderr(stderr: string): string {
  const accumulator = createCodexStderrAccumulator();
  const display = consumeCodexStderr(accumulator, stderr);
  const trailing = flushCodexStderr(accumulator);
  return `${display}${trailing}`.trim();
}

export const codexLocalAdapter: AgentExecutionAdapter = {
  type: "codex_local",
  name: "Codex Local",
  description:
    "Structured Codex CLI execution using JSON event streaming. Intended to replace the legacy detached launch path while keeping it available as an escape hatch.",
  providerId: codexCliProvider.id,
  executionEngine: "structured_cli",
  supportsDetachedRuns: true,
  supportsSessionResume: false,
  models: codexCliProvider.models,
  async testEnvironment() {
    return providerStatusToEnvironmentTest(
      "codex_local",
      await codexCliProvider.healthCheck(),
      codexCliProvider.installMessage
    );
  },
  async execute(ctx) {
    const command =
      readStringConfig(ctx.config, "command") || resolveCliCommand(codexCliProvider);
    const args = buildCodexArgs(ctx.config);
    const stdoutAccumulator = createCodexStreamAccumulator();
    const stderrAccumulator = createCodexStderrAccumulator();

    await ctx.onMeta?.({
      adapterType: ctx.adapterType,
      command,
      commandArgs: args,
      cwd: ctx.cwd,
      env: {
        PATH: ADAPTER_RUNTIME_PATH,
      },
    });

    const result = await runChildProcess(command, args, {
      cwd: ctx.cwd,
      stdin: ctx.prompt,
      timeoutMs: ctx.timeoutMs,
      onSpawn: ctx.onSpawn,
      onStdout: (chunk) => {
        const display = consumeCodexJsonStream(stdoutAccumulator, chunk);
        if (!display) return;
        void ctx.onLog("stdout", display);
      },
      onStderr: (chunk) => {
        const display = consumeCodexStderr(stderrAccumulator, chunk);
        if (!display) return;
        void ctx.onLog("stderr", display);
      },
    });

    const trailingStdout = flushCodexJsonStream(stdoutAccumulator);
    if (trailingStdout) {
      await ctx.onLog("stdout", trailingStdout);
    }

    const trailingStderr = flushCodexStderr(stderrAccumulator);
    if (trailingStderr) {
      await ctx.onLog("stderr", trailingStderr);
    }

    const filteredStderr = filterCodexStderr(result.stderr);
    const output = stdoutAccumulator.display.trim() || null;
    const summaryLine =
      firstNonEmptyLine(stdoutAccumulator.lastAgentMessage || output || "")?.slice(0, 300) || null;

    return {
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      errorMessage:
        result.exitCode === 0
          ? null
          : filteredStderr || result.stderr.trim() || output || "Codex local execution failed.",
      usage: stdoutAccumulator.usage,
      sessionId: stdoutAccumulator.threadId,
      provider: codexCliProvider.id,
      model: readStringConfig(ctx.config, "model") || null,
      billingType: "unknown",
      summary: summaryLine,
      output,
    };
  },
};
