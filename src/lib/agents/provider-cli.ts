import fs from "fs";
import { execSync, spawn } from "child_process";
import type { AgentProvider } from "./provider-interface";
import { getNvmNodeBin } from "./nvm-path";

const nvmBin = getNvmNodeBin();

export const RUNTIME_PATH = [
  ...(nvmBin ? [nvmBin] : []),
  `${process.env.HOME || ""}/.local/bin`,
  `${process.env.HOME || ""}/.bun/bin`,
  `${process.env.HOME || ""}/.hermes/bin`,
  "/usr/local/bin",
  "/opt/homebrew/bin",
  process.env.PATH || "",
].filter(Boolean).join(":");

export function resolveCliCommand(provider: AgentProvider): string {
  const candidates = [
    ...(provider.commandCandidates || []),
    provider.command,
  ].filter((candidate): candidate is string => !!candidate);

  for (const candidate of candidates) {
    if (candidate.includes("/") && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const candidate of candidates) {
    if (candidate.includes("/")) continue;
    try {
      const resolved = execSync(`command -v ${candidate}`, {
        encoding: "utf8",
        env: { ...process.env, PATH: RUNTIME_PATH },
        stdio: ["ignore", "pipe", "ignore"],
      }).trim();

      if (resolved) {
        return resolved;
      }
    } catch {
      // Ignore and keep trying.
    }
  }

  if (!provider.command) {
    throw new Error(`Provider ${provider.id} does not define a command`);
  }

  return provider.command;
}

export async function checkCliProviderAvailable(provider: AgentProvider): Promise<boolean> {
  return new Promise((resolve) => {
    let command: string;
    try {
      command = resolveCliCommand(provider);
    } catch {
      resolve(false);
      return;
    }

    const versionArgs = provider.id === "codex-cli" ? ["--version"] : ["--version"];
    const proc = spawn(command, versionArgs, {
      env: {
        ...process.env,
        PATH: RUNTIME_PATH,
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const settle = (value: boolean) => {
      clearTimeout(timeout);
      resolve(value);
    };

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        settle(true);
        return;
      }

      const combined = `${stdout}
${stderr}`.toLowerCase();
      if (provider.id === "codex-cli" && combined.includes("codex-cli")) {
        settle(true);
        return;
      }

      settle(false);
    });

    proc.on("error", () => {
      settle(false);
    });

    const timeout = setTimeout(() => {
      proc.kill();
      settle(false);
    }, 5000);
  });
}
